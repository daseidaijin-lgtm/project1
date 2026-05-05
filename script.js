let model;
let video = document.getElementById("video");
let ctx = document.getElementById("canvas").getContext("2d");

let board;
let currentPlayer;
let mode;

let lastCell = null;
let startTime = 0;

// 初期化
function resetGame(){
  board = [
    ["","",""],
    ["","",""],
    ["","",""]
  ];
  currentPlayer = "O";
  mode = mode || "pvp";
  document.getElementById("victory").style.display="none";
  updateTurn();
}

function setMode(m){
  mode = m;
  resetGame();
}

function updateTurn(){
  document.getElementById("turn").innerText =
    "現在のターン: " + currentPlayer;
}

// カメラ
async function setupCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({video:true});
  video.srcObject = stream;
  await video.play();
}

// モデル
async function loadModel(){
  model = await handpose.load();
}

// グリッド
function drawGrid(){
  ctx.clearRect(0,0,300,225);
  ctx.strokeStyle="black";

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

  ctx.font="40px Arial";
  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      ctx.fillText(board[y][x], x*100+30, y*75+50);
    }
  }
}

// セル取得
function getCell(x,y){
  return {
    col: Math.floor(x/100),
    row: Math.floor(y/75)
  };
}

// 指の本数
function countFingers(hand){
  const tips = [8,12,16,20];
  let count = 0;

  tips.forEach(i=>{
    if(hand.landmarks[i][1] < hand.landmarks[i-2][1]) count++;
  });

  return count;
}

// ジェスチャー
function getGesture(hand){
  const count = countFingers(hand);
  return count >= 3 ? "X" : "O";
}

// 勝利判定
function checkWin(){
  const b = board;

  for(let i=0;i<3;i++){
    if(b[i][0] && b[i][0]==b[i][1] && b[i][1]==b[i][2]) return true;
    if(b[0][i] && b[0][i]==b[1][i] && b[1][i]==b[2][i]) return true;
  }

  if(b[0][0] && b[0][0]==b[1][1] && b[1][1]==b[2][2]) return true;
  if(b[0][2] && b[0][2]==b[1][1] && b[1][1]==b[2][0]) return true;

  return false;
}

// CPU
function cpuMove(){
  let empty = [];

  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      if(!board[y][x]) empty.push({y,x});
    }
  }

  if(empty.length === 0) return;

  const move = empty[Math.floor(Math.random()*empty.length)];
  board[move.y][move.x] = "X";

  if(checkWin()){
    document.getElementById("victory").style.display="block";
    return;
  }

  currentPlayer = "O";
  updateTurn();
}

// メイン
async function detect(){
  drawGrid();

  const preds = await model.estimateHands(video);

  if(preds.length>0){
    const hand = preds[0];
    const x = hand.landmarks[8][0];
    const y = hand.landmarks[8][1];

    const cell = getCell(x,y);

    if(cell.row<3 && cell.col<3){
      if(lastCell &&
         cell.row==lastCell.row &&
         cell.col==lastCell.col){

        if(Date.now()-startTime > 3000){
          if(!board[cell.row][cell.col]){

            board[cell.row][cell.col] = currentPlayer;

            if(checkWin()){
              document.getElementById("victory").style.display="block";
              return;
            }

            currentPlayer = currentPlayer === "O" ? "X" : "O";
            updateTurn();

            if(mode === "cpu" && currentPlayer === "X"){
              cpuMove();
            }
          }
        }

      } else {
        lastCell = cell;
        startTime = Date.now();
      }
    }
  }

  requestAnimationFrame(detect);
}

// 開始
async function start(){
  resetGame();
  await setupCamera();
  await loadModel();
  detect();
}