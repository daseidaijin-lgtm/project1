let model;
let video = document.getElementById("video");
let ctx = document.getElementById("canvas").getContext("2d");

let board;
let currentPlayer;
let mode = "pvp";
let cpuLevel = "easy";

let lastCell = null;
let lastGesture = null;
let holdStartTime = 0;

let cooldown = false;
let gameOver = false;

const HOLD_TIME = 3000;
const COOLDOWN_TIME = 1500;

function resetGame(){
  board = [["","",""],["","",""],["","",""]];
  currentPlayer = "O";
  lastCell = null;
  lastGesture = null;
  holdStartTime = 0;
  cooldown = false;
  gameOver = false;

  document.getElementById("victory").style.display = "none";
  updateTurn();
  drawGrid();
}

function setMode(m){
  mode = m;
  resetGame();
}

function updateTurn(){
  document.getElementById("turn").innerText =
    "現在のターン: " + currentPlayer;
}

async function setupCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 640 },
      height: { ideal: 480 }
    },
    audio: false
  });

  video.srcObject = stream;
  await video.play();
}

async function loadModel(){
  model = await handpose.load();
}

function drawGrid(activeCell=null, progress=0){
  ctx.clearRect(0,0,300,225);

  if(activeCell){
    ctx.fillStyle = "rgba(0,255,120,0.55)";
    ctx.fillRect(activeCell.col*100, activeCell.row*75,100,75);

    ctx.fillStyle = "rgba(0,255,255,0.9)";
    ctx.fillRect(activeCell.col*100, activeCell.row*75+66,100*progress,9);
  }

  ctx.strokeStyle="black";
  ctx.lineWidth=3;

  for(let i=1;i<3;i++){
    ctx.beginPath();
    ctx.moveTo(i*100,0);
    ctx.lineTo(i*100,225);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0,i*75);
    ctx.lineTo(300,i*75);
    ctx.stroke();
  }

  ctx.font="42px Arial";
  ctx.textAlign="center";
  ctx.textBaseline="middle";

  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      ctx.fillStyle="black";
      ctx.fillText(board[y][x],x*100+50,y*75+38);
    }
  }
}

function getCell(x,y){
  const col = Math.floor(x/100);
  const row = Math.floor(y/75);

  if(row < 0 || row > 2 || col < 0 || col > 2){
    return null;
  }

  return { row, col };
}

function distance(a,b){
  return Math.hypot(a[0]-b[0], a[1]-b[1]);
}

function countFingers(hand){
  const lm = hand.landmarks;
  let count = 0;

  const tips = [8,12,16,20];
  const pips = [6,10,14,18];

  for(let i=0;i<tips.length;i++){
    if(lm[tips[i]][1] < lm[pips[i]][1]){
      count++;
    }
  }

  return count;
}

function getGesture(hand){
  const lm = hand.landmarks;

  const thumbIndexDist = distance(lm[4], lm[8]);
  const fingers = countFingers(hand);

  if(thumbIndexDist < 28) return "O";

  if(fingers >= 4) return "X";

  return null;
}

function checkWin(){
  const b = board;

  for(let i=0;i<3;i++){
    if(b[i][0] && b[i][0]===b[i][1] && b[i][1]===b[i][2]) return true;
    if(b[0][i] && b[0][i]===b[1][i] && b[1][i]===b[2][i]) return true;
  }

  if(b[0][0] && b[0][0]===b[1][1] && b[1][1]===b[2][2]) return true;
  if(b[0][2] && b[0][2]===b[1][1] && b[1][1]===b[2][0]) return true;

  return false;
}

function showVictory(){
  gameOver = true;
  document.getElementById("victory").style.display = "block";
}

function cpuMove(){
  cpuLevel = document.getElementById("cpuLevel").value;

  if(cpuLevel === "easy"){
    cpuRandomMove();
  } else if(cpuLevel === "normal"){
    cpuNormalMove();
  } else {
    cpuHardMove();
  }
}

function getEmptyCells(){
  let empty = [];

  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      if(!board[y][x]) empty.push({y,x});
    }
  }

  return empty;
}

function cpuRandomMove(){
  const empty = getEmptyCells();
  if(empty.length === 0) return;

  const move = empty[Math.floor(Math.random()*empty.length)];
  placeCpu(move);
}

function cpuNormalMove(){
  const winMove = findBestMove("X");
  if(winMove){
    placeCpu(winMove);
    return;
  }

  const blockMove = findBestMove("O");
  if(blockMove){
    placeCpu(blockMove);
    return;
  }

  cpuRandomMove();
}

function cpuHardMove(){
  const best = minimax(board, "X").move;
  if(best){
    placeCpu(best);
  }
}

function placeCpu(move){
  board[move.y][move.x] = "X";

  if(checkWin()){
    showVictory();
    return;
  }

  currentPlayer = "O";
  updateTurn();
}

function findBestMove(player){
  const empty = getEmptyCells();

  for(const move of empty){
    board[move.y][move.x] = player;

    const win = checkWin();

    board[move.y][move.x] = "";

    if(win) return move;
  }

  return null;
}

function minimax(newBoard, player){
  const empty = getEmptyCells();

  if(checkWinnerFor("X")) return { score: 10 };
  if(checkWinnerFor("O")) return { score: -10 };
  if(empty.length === 0) return { score: 0 };

  let moves = [];

  for(const cell of empty){
    newBoard[cell.y][cell.x] = player;

    let result;
    if(player === "X"){
      result = minimax(newBoard, "O");
    } else {
      result = minimax(newBoard, "X");
    }

    moves.push({
      move: cell,
      score: result.score
    });

    newBoard[cell.y][cell.x] = "";
  }

  let bestMove;

  if(player === "X"){
    let bestScore = -Infinity;
    for(let i=0;i<moves.length;i++){
      if(moves[i].score > bestScore){
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  } else {
    let bestScore = Infinity;
    for(let i=0;i<moves.length;i++){
      if(moves[i].score < bestScore){
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  }

  return moves[bestMove];
}

function checkWinnerFor(player){
  const b = board;

  for(let i=0;i<3;i++){
    if(b[i][0]===player && b[i][1]===player && b[i][2]===player) return true;
    if(b[0][i]===player && b[1][i]===player && b[2][i]===player) return true;
  }

  if(b[0][0]===player && b[1][1]===player && b[2][2]===player) return true;
  if(b[0][2]===player && b[1][1]===player && b[2][0]===player) return true;

  return false;
}
async function detect(){
  if(cooldown || gameOver){
    drawGrid();
    requestAnimationFrame(detect);
    return;
  }

  const preds = await model.estimateHands(video);

  if(preds.length > 0){
    const hand = preds[0];

    const x = hand.landmarks[8][0];
    const y = hand.landmarks[8][1];

    const cell = getCell(x,y);
    const gesture = getGesture(hand);

    if(cell && gesture && !board[cell.row][cell.col]){
      if(
        lastCell &&
        cell.row === lastCell.row &&
        cell.col === lastCell.col &&
        gesture === lastGesture
      ){
        const elapsed = Date.now() - holdStartTime;
        const progress = Math.min(elapsed / HOLD_TIME, 1);

        drawGrid(cell, progress);

        if(elapsed >= HOLD_TIME){
          if(mode === "cpu"){
            board[cell.row][cell.col] = "O";

            if(checkWin()){
              showVictory();
              return;
            }

            currentPlayer = "X";
            updateTurn();
            setTimeout(cpuMove, 700);
          } else {
            board[cell.row][cell.col] = gesture;

            if(checkWin()){
              showVictory();
              return;
            }

            currentPlayer = currentPlayer === "O" ? "X" : "O";
            updateTurn();
          }

          cooldown = true;
          lastCell = null;
          lastGesture = null;
          holdStartTime = 0;

          setTimeout(() => {
            cooldown = false;
          }, COOLDOWN_TIME);
        }
      } else {
        lastCell = cell;
        lastGesture = gesture;
        holdStartTime = Date.now();
        drawGrid(cell, 0);
      }
    } else {
      lastCell = null;
      lastGesture = null;
      holdStartTime = 0;
      drawGrid();
    }
  } else {
    lastCell = null;
    lastGesture = null;
    holdStartTime = 0;
    drawGrid();
  }

  requestAnimationFrame(detect);
}

async function start(){
  resetGame();
  await setupCamera();
  await loadModel();
  detect();
}

resetGame();
