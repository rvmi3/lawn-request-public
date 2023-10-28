function validateTimeInputs(startTod, endTod, startHour, endHour) {
  startTod = startTod.toLowerCase();
  endTod = endTod.toLowerCase();
  startHour = parseInt(startHour);
  endHour = parseInt(endHour);
  if (startTod !== "am" && startTod !== "pm") {
    return false;
  }

  if (endTod !== "am" && endTod !== "pm") {
    return false;
  }

  if (startHour < 0 || startHour > 11) {
    return false;
  }

  if (endHour < 0 || endHour > 11) {
    return false;
  }

  // If all checks pass, you can return a success message or null to indicate no errors.
  return true;
}

module.exports = { validateTimeInputs };
