function updateClock() {
  const now = new Date();

  let hour = now.getHours();
  const minute = now.getMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  document.getElementById('hour').textContent = hour.toString().padStart(2, '0');
  document.getElementById('minute').textContent = minute.toString().padStart(2, '0');
  document.getElementById('ampm').textContent = ampm;

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  document.querySelector('.date').textContent = dateStr;
}

setInterval(updateClock, 1000);
updateClock();