// Object to store last active times for tabs
const lastActiveTimes = {};

// Default threshold for tab inactivity
let inactivityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

// Function to update tab's last active time
function updateTabActivity(tabId) {
  lastActiveTimes[tabId] = Date.now();
}

// Function to check if a tab is playing audio or video
function isTabPlayingAudioOrVideo(tab) {
  return tab.audible || (tab.mutedInfo && tab.mutedInfo.muted);
}

// Function to suspend inactive tab
function suspendTab(tabId) {
  chrome.tabs.discard(tabId);
}

// Function to check tab inactivity and suspend inactive tabs
function checkTabInactivity() {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach((tab) => {
      const tabId = tab.id;
      const lastActiveTime = lastActiveTimes[tabId] || 0;
      const idleTime = Date.now() - lastActiveTime;
      // Suspend inactive tab if not playing audio or video and not active
      if (
        tab.active !== true &&
        idleTime > inactivityThreshold &&
        !isTabPlayingAudioOrVideo(tab)
      ) {
        console.log(`Tab ${tabId} is inactive for ${idleTime} milliseconds.`);
        suspendTab(tabId);
      }
    });
  });
}

// Listen for tab events to update last active time
chrome.tabs.onActivated.addListener(function (activeInfo) {
  updateTabActivity(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    updateTabActivity(tabId);
  }
});

let intervalId; // Variable to store the interval ID

// Function to start or stop tab suspension based on switch state
function toggleTabSuspension(enableSuspension) {
  if (enableSuspension) {
    // Clear existing interval
    clearInterval(intervalId);
    // Start periodic check for tab inactivity with new time interval
    intervalId = setInterval(checkTabInactivity, inactivityThreshold);
  } else {
    // Stop periodic check for tab inactivity
    clearInterval(intervalId);
  }
  // Save the switch state to browser storage
  chrome.storage.sync.set({ tabSuspensionEnabled: enableSuspension });
}

// Listen for changes in the on/off switch
const onOffSwitch = document.querySelector('.switch input[type="checkbox"]');
onOffSwitch.addEventListener("change", function () {
  toggleTabSuspension(this.checked);
});

// Retrieve switch state from browser storage and set the switch accordingly
chrome.storage.sync.get("tabSuspensionEnabled", function (data) {
  const isEnabled = data.tabSuspensionEnabled || false;
  onOffSwitch.checked = isEnabled;
  toggleTabSuspension(isEnabled);
});

// Retrieve last set time from browser storage
chrome.storage.sync.get("lastSetTime", function (data) {
  const lastSetTime = data.lastSetTime;
  if (lastSetTime) {
    inactivityThreshold = lastSetTime;
    console.log(
      `Last set time retrieved: ${inactivityThreshold} milliseconds.`
    );
    // Update the display of current time
    const currentTimerElement = document.querySelector(".current_timer strong");
    currentTimerElement.textContent = `${
      inactivityThreshold / (60 * 1000)
    } mins`;
  }
});

// Function to handle setting new time
document
  .querySelector(".set_button button")
  .addEventListener("click", function () {
    const newTime = parseInt(
      document.querySelector('input[name="new_time"]').value
    );
    if (!isNaN(newTime)) {
      // Convert minutes to milliseconds
      inactivityThreshold = newTime * 60 * 1000;
      console.log(`New inactivity threshold set to ${newTime} minutes.`);
      // Save the new time to browser storage
      chrome.storage.sync.set({ lastSetTime: inactivityThreshold });
      // Update the display of current time
      const currentTimerElement = document.querySelector(
        ".current_timer strong"
      );
      currentTimerElement.textContent = `${newTime} mins`;
      // Restart tab suspension with new time interval
      toggleTabSuspension(onOffSwitch.checked);
    } else {
      console.log("Please enter a valid number for the new time.");
    }
  });
