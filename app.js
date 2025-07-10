
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

  plotEMA(candles, 10, ema10Color);
  plotEMA(candles, 50, ema50Color);
}

function plotEMA(candles, period, color) {
  let emaArray = [];
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  emaArray.push(ema);

  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    emaArray.push(ema);
  }

  ctx.strokeStyle = color;
  ctx.beginPath();

  emaArray.forEach((emaVal, index) => {
    const x = index * (candleWidth + candleGap) + candleWidth/2;
    const minPrice = Math.min(...emaArray.concat(candles.map(c => c.low)));
    const maxPrice = Math.max(...emaArray.concat(candles.map(c => c.high)));
    const y = height - (emaVal - minPrice) * (height / (maxPrice - minPrice));
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

fetchData();
