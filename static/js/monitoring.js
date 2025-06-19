function updateSuhuUI(suhuData) {
  if (!Array.isArray(suhuData) || suhuData.length === 0) return;

  const suhuNum = suhuData.map(Number);
  const current = suhuNum[suhuNum.length - 1];
  const oneHourAgo = suhuNum.length > 1 ? suhuNum[suhuNum.length - 2] : current;

  const now = new Date();
  const currentHour = now.getHours();
  const totalLength = suhuNum.length;

  const todayData = totalLength >= currentHour && currentHour > 0
    ? suhuNum.slice(-currentHour)
    : [];
  const yesterdayData = totalLength >= currentHour + 24
    ? suhuNum.slice(-(currentHour + 24), -currentHour)
    : [];

  const avgToday = todayData.length > 0
    ? todayData.reduce((a, b) => a + b, 0) / todayData.length
    : null;

  const avgYesterday = yesterdayData.length > 0
    ? yesterdayData.reduce((a, b) => a + b, 0) / yesterdayData.length
    : null;

  const diffDay = (avgToday !== null && avgYesterday !== null)
    ? avgToday - avgYesterday
    : null;

  const totalDays = Math.floor(totalLength / 24);
  const daysThisWeek = Math.min(totalDays, 7);
  const daysLastWeek = totalDays >= 14 ? 7 : (totalDays >= 8 ? totalDays - 7 : 0);

  const weekThisData = suhuNum.slice(-(daysThisWeek * 24));
  const weekLastData = suhuNum.slice(-(daysThisWeek + daysLastWeek) * 24, -daysThisWeek * 24);

  const avgThisWeek = weekThisData.length > 0
    ? weekThisData.reduce((a, b) => a + b, 0) / weekThisData.length
    : null;

  const avgLastWeek = weekLastData.length > 0
    ? weekLastData.reduce((a, b) => a + b, 0) / weekLastData.length
    : null;

  const diffWeek = (avgThisWeek !== null && avgLastWeek !== null)
    ? avgThisWeek - avgLastWeek
    : null;

  const tempMainEl = document.querySelector('.temp-main');
  const controlTempEl = document.querySelector('.control-panel .control p');
  if (tempMainEl) tempMainEl.textContent = current;
  if (controlTempEl) controlTempEl.textContent = `${current}°C`;

  const diffHour = current - oneHourAgo;
  const arrowHour = diffHour < 0 ? '▼' : '▲';
  const colorHour = diffHour < 0 ? 'red' : 'green';

  const arrowDay = diffDay !== null ? (diffDay < 0 ? '▼' : '▲') : '';
  const colorDay = diffDay !== null ? (diffDay < 0 ? 'red' : 'green') : 'gray';

  const arrowWeek = diffWeek !== null ? (diffWeek < 0 ? '▼' : '▲') : '';
  const colorWeek = diffWeek !== null ? (diffWeek < 0 ? 'red' : 'green') : 'gray';

  const statusInfo = document.querySelector('.status-info');
  if (statusInfo) {
    statusInfo.innerHTML = `
      <p>1 Hour Ago<br>
        <span class="blue">${oneHourAgo.toFixed(1)}°C</span> 
        <span class="${colorHour}">${arrowHour} ${Math.abs(diffHour).toFixed(1)}°C</span>
      </p>
      <p>1 Day Ago<br>
        ${diffDay !== null ? `
          <span class="${colorDay}">${avgYesterday.toFixed(1)}°C ${arrowDay} ${Math.abs(diffDay).toFixed(1)}°C</span>
        ` : '<span class="gray">Not enough data</span>'}
      </p>
      <p>1 Week Ago<br>
        ${diffWeek !== null ? `
          <span class="${colorWeek}">${avgLastWeek.toFixed(1)}°C ${arrowWeek} ${Math.abs(diffWeek).toFixed(1)}°C</span>
        ` : '<span class="gray">Not enough data</span>'}
      </p>
    `;
  }
}

let suhu = [];

const saved = sessionStorage.getItem('lastSuhuData');
if (saved) {
  try {
    suhu = JSON.parse(saved);
    updateSuhuUI(suhu);
  } catch (e) {
    console.error("Invalid data from sessionStorage", e);
  }
} else {
  const statusInfo = document.querySelector('.status-info');
  if (statusInfo) statusInfo.textContent = 'Waiting for temperature data...';
}

window.addEventListener('message', (event) => {
  if (event.data && event.data.source === "grafik" && Array.isArray(event.data.data)) {
    suhu = event.data.data;
    sessionStorage.setItem('lastSuhuData', JSON.stringify(suhu));
    updateSuhuUI(suhu);
  }
});

function toggleDevice(device) {
  const currentStatus = document.getElementById(`${device === "uvlamp" ? "uv" : "feed"}-text`).textContent;
  let newStatus = "";

  if (device === "uvlamp") {
    newStatus = currentStatus === "ON" ? "off" : "on";
  } else if (device === "foodbottle") {
    newStatus = currentStatus === "OPEN" ? "closed" : "open";
  }

  fetch("/control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device: device, action: newStatus })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "success") {
      updateControlPanelFromServer();
      updateDeviceIcons(); // Tambahan penting agar gambar ikut update
    } else {
      alert("Gagal memperbarui status.");
    }
  })
  .catch(err => console.error("Error:", err));
}

function updateControlPanelFromServer() {
  fetch("/get-control-status")
    .then(res => res.json())
    .then(data => {
      document.getElementById("temp-text").textContent = data.temperature + "°C";
      document.getElementById("feed-text").textContent = data.foodbottle.toUpperCase();
      document.getElementById("uv-text").textContent = data.uvlamp.toUpperCase();
    })
    .catch(err => console.error("Error fetching control status:", err));
}

function updateDeviceIcons() {
  fetch("/get-control-status")
    .then(res => res.json())
    .then(data => {
      const iconsDiv = document.querySelector(".icons");
      if (!iconsDiv) return;
      iconsDiv.innerHTML = "";

      if (data.uvlamp === "on") {
        const img = document.createElement("img");
        img.src = "/static/images/uvlamp.png";
        img.alt = "UV Lamp";
        iconsDiv.appendChild(img);
      }

      if (data.foodbottle === "open") {
        const img = document.createElement("img");
        img.src = "/static/images/foodbottle.png";
        img.alt = "Food Bottle";
        iconsDiv.appendChild(img);
      }
    })
    .catch(err => console.error("Error fetching icons:", err));
}

updateControlPanelFromServer();
updateDeviceIcons();
setInterval(updateControlPanelFromServer, 5000);
setInterval(updateDeviceIcons, 5000);