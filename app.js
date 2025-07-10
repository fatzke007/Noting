
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const candleWidth = 6;
const candleGap = 2;
const ema10Color = 'yellow';
const ema50Color = 'cyan';

async function fetchData() {
  const res = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=100");
  const data = await res.json();

  const candles = data.map(d => ({
    time: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4])
  }));

  drawChart(candles);
}

function calculateEMA(candles, period) {
  let emaArray = [];
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  emaArray.push(ema);

  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    emaArray.push(ema);
  }
  return emaArray;
}

function drawChart(candles) {
  ctx.clearRect(0, 0, width, height);

  const prices = candles.flatMap(c => [c.open, c.high, c.low, c.close]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const scaleY = height / (maxPrice - minPrice);

  candles.forEach((candle, index) => {
    const x = index * (candleWidth + candleGap);
    const yOpen = height - (candle.open - minPrice) * scaleY;
    const yClose = height - (candle.close - minPrice) * scaleY;
    const yHigh = height - (candle.high - minPrice) * scaleY;
    const yLow = height - (candle.low - minPrice) * scaleY;

    const color = candle.close >= candle.open ? 'lime' : 'red';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + candleWidth/2, yHigh);
    ctx.lineTo(x + candleWidth/2, yLow);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x, Math.min(yOpen, yClose), candleWidth, Math.abs(yClose - yOpen));
  });

  const ema10 = calculateEMA(candles, 10);
  const ema50 = calculateEMA(candles, 50);

  plotEMAFromArray(ema10, ema10Color, candles);
  plotEMAFromArray(ema50, ema50Color, candles);

  checkCrossovers(candles, ema10, ema50);
}

function plotEMAFromArray(emaArray, color, candles) {
  ctx.strokeStyle = color;
  ctx.beginPath();

  const prices = candles.flatMap(c => [c.open, c.high, c.low, c.close]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const scaleY = height / (maxPrice - minPrice);

  emaArray.forEach((emaVal, index) => {
    const x = index * (candleWidth + candleGap) + candleWidth/2;
    const y = height - (emaVal - minPrice) * scaleY;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function checkCrossovers(candles, ema10Array, ema50Array) {
  const prices = candles.flatMap(c => [c.open, c.high, c.low, c.close]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const scaleY = height / (maxPrice - minPrice);

  for (let i = 1; i < ema10Array.length; i++) {
    const prevDiff = ema10Array[i - 1] - ema50Array[i - 1];
    const currDiff = ema10Array[i] - ema50Array[i];

    const x = i * (candleWidth + candleGap) + candleWidth/2;
    const y = height - (candles[i].close - minPrice) * scaleY;

    if (prevDiff <= 0 && currDiff > 0) {
      ctx.fillStyle = 'lime';
      ctx.beginPath();
      ctx.arc(x, y - 10, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    if (prevDiff >= 0 && currDiff < 0) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(x, y + 10, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

fetchData();
