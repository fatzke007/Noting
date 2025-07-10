
const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const width = canvas.width;
const height = canvas.height;

const candleWidth = 6;
const candleGap = 2;
const ema10Color = 'yellow';
const ema50Color = 'cyan';
const ema200Color = 'white';

let stats = {
  totalTrades: 0,
  wins: 0,
  losses: 0
};

async function fetchData() {
  const res = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=200");
  const data = await res.json();

  const candles = data.map(d => ({
    time: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5])
  }));

  drawChart(candles);
  drawStats();
}

function calculateEMA(values, period) {
  let emaArray = [];
  const k = 2 / (period + 1);
  let ema = values[0];
  emaArray.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    emaArray.push(ema);
  }
  return emaArray;
}

function calculateRSI(candles, period = 14) {
  let rsiArray = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    let change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }
  gains /= period;
  losses /= period;
  rsiArray[period] = 100 - (100 / (1 + gains / losses));
  for (let i = period + 1; i < candles.length; i++) {
    let change = candles[i].close - candles[i - 1].close;
    gains = (gains * (period - 1) + (change > 0 ? change : 0)) / period;
    losses = (losses * (period - 1) + (change < 0 ? -change : 0)) / period;
    rsiArray[i] = 100 - (100 / (1 + gains / losses));
  }
  return rsiArray;
}

function calculateATR(candles, period = 14) {
  let atrArray = [];
  let trArray = [];
  for (let i = 1; i < candles.length; i++) {
    let high = candles[i].high;
    let low = candles[i].low;
    let prevClose = candles[i - 1].close;
    let tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trArray.push(tr);
  }
  let atr = trArray.slice(0, period).reduce((a, b) => a + b, 0) / period;
  atrArray[period] = atr;
  for (let i = period + 1; i < trArray.length; i++) {
    atr = (atr * (period - 1) + trArray[i]) / period;
    atrArray[i] = atr;
  }
  return atrArray;
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

  const closes = candles.map(c => c.close);
  const ema10 = calculateEMA(closes, 10);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(candles, 14);
  const atr = calculateATR(candles, 14);

  plotEMAFromArray(ema10, ema10Color, candles);
  plotEMAFromArray(ema50, ema50Color, candles);
  plotEMAFromArray(ema200, ema200Color, candles);

  checkSmartSignals(candles, ema10, ema50, ema200, rsi, atr);
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

function checkSmartSignals(candles, ema10, ema50, ema200, rsi, atr) {
  const prices = candles.flatMap(c => [c.open, c.high, c.low, c.close]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const scaleY = height / (maxPrice - minPrice);

  let lastSignalIndex = -20;

  for (let i = 20; i < candles.length; i++) {
    const prevCross = ema10[i - 1] - ema50[i - 1];
    const currCross = ema10[i] - ema50[i];
    const price = candles[i].close;
    const ema200Val = ema200[i];
    const rsiVal = rsi[i];
    const atrVal = atr[i];
    const avgATR = atr.slice(i - 14, i).reduce((a, b) => a + b, 0) / 14;
    const x = i * (candleWidth + candleGap) + candleWidth/2;
    const y = height - (price - minPrice) * scaleY;

    if (i - lastSignalIndex >= 20) {
      let confidence = 0;
      if (price > ema200Val) confidence++;
      if (rsiVal > 50) confidence++;
      if (atrVal > avgATR) confidence++;
      if (prevCross < 0 && currCross >= 0 && confidence >= 2) {
        ctx.fillStyle = confidence === 3 ? 'gold' : 'lime';
        ctx.beginPath();
        ctx.arc(x, y - 10, confidence === 3 ? 8 : 5, 0, 2 * Math.PI);
        ctx.fill();
        stats.totalTrades++;
        lastSignalIndex = i;
      }
      if (price < ema200Val) confidence++;
      if (rsiVal < 50) confidence++;
      if (atrVal > avgATR) confidence++;
      if (prevCross > 0 && currCross <= 0 && confidence >= 2) {
        ctx.fillStyle = confidence === 3 ? 'orange' : 'red';
        ctx.beginPath();
        ctx.arc(x, y + 10, confidence === 3 ? 8 : 5, 0, 2 * Math.PI);
        ctx.fill();
        stats.totalTrades++;
        lastSignalIndex = i;
      }
    }
  }
}

function drawStats() {
  ctx.fillStyle = 'white';
  ctx.font = '14px Arial';
  ctx.fillText(`Total trades: ${stats.totalTrades}`, 10, 20);
  ctx.fillText(`Win rate (placeholder): 60%`, 10, 40);
}

fetchData();
