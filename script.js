let model;
let video = document.getElementById("video");
let ctx = document.getElementById("canvas").getContext("2d");

let board;
let currentPlayer;
let mode = "pvp";

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
    video: { facingMode: "environment" },
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
    ctx.fillStyle="rgba(255,255,0,0.3)";
    ctx.fillRect(activeCell.col*100, activeCell.row*75,100,75);

    ctx.fillStyle="black";
    ctx.fillRect(activeCell.col*100, activeCell.row*75+68,100*progress,7);
  }

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
      ctx.fillText(board[y][x],x*100+30,y*75+50);
    }
  }
}

function getCell(x,y){
  return { col:Math.floor(x/100), row:Math.floor(y/75) };
}

function distance(a,b){
  return Math.hypot(a[0]-b[0], a[1]-b[1]);
}

function countFingers(hand){
  const lm=hand.landmarks;
  let count=0;
  const tips=[8,12,16,20];
  const pips=[6,10,14,18];

  for(let i=0;i<tips.length;i++){
    if(lm[tips[i]][1]<lm[pips[i]][1]) count++;
  }
  return count;
}

function getGesture(hand){
  const lm=hand.landmarks;
  const dist=distance(lm[4],lm[8]);
  const fingers=countFingers(hand);

  if(dist<35) return "O";
  if(fingers>=3) return "X";
  return null;
}

function checkWin(){
  const b=board;

  for(let i=0;i<3;i++){
    if(b[i][0]&&b[i][0]==b[i][1]&&b[i][1]==b[i][2]) return true;
    if(b[0][i]&&b[0][i]==b[1][i]&&b[1][i]==b[2][i]) return true;
  }
  if(b[0][0]&&b[0][0]==b[1][1]&&b[1][1]==b[2][2]) return true;
  if(b[0][2]&&b[0][2]==b[1][1]&&b[1][1]==b[2][0]) return true;

  return false;
}

function cpuMove(){
  let empty=[];
  for(let y=0;y<3;y++){
    for(let x=0;x<3;x++){
      if(!board[y][x]) empty.push({y,x});
    }
  }
  if(empty.length===0) return;

  const move=empty[Math.floor(Math.random()*empty.length)];
  board[move.y][move.x]="X";

  if(checkWin()){
    document.getElementById("victory").style.display="block";
    return;
  }

  currentPlayer="O";
  updateTurn();
}

async function detect(){
  if(cooldown||gameOver){
    drawGrid();
    requestAnimationFrame(detect);
    return;
  }

  const preds=await model.estimateHands(video);

  if(preds.length>0){
    const hand=preds[0];
    const x=hand.landmarks[8][0];
    const y=hand.landmarks[8][1];

    const cell=getCell(x,y);
    const gesture=getGesture(hand);

    if(cell&&gesture&&!board[cell.row][cell.col]){
      if(lastCell&&cell.row==lastCell.row&&cell.col==lastCell.col&&gesture==lastGesture){

        if(Date.now()-holdStartTime>HOLD_TIME){

          if(mode==="cpu"){
            board[cell.row][cell.col]="O";
            currentPlayer="X";
            cpuMove();
          }else{
            board[cell.row][cell.col]=gesture;
            currentPlayer=currentPlayer==="O"?"X":"O";
          }

          if(checkWin()){
            document.getElementById("victory").style.display="block";
            gameOver=true;
          }

          cooldown=true;
          setTimeout(()=>cooldown=false,COOLDOWN_TIME);
        }

      }else{
        lastCell=cell;
        lastGesture=gesture;
        holdStartTime=Date.now();
      }

      let progress=(Date.now()-holdStartTime)/HOLD_TIME;
      drawGrid(cell,progress);

    }else{
      lastCell=null;
      lastGesture=null;
      drawGrid();
    }

  }else{
    lastCell=null;
    lastGesture=null;
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
