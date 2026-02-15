const container = document.getElementById('game-board');
const status = document.getElementById('status');
let turn = 'g';
let sel = null;
let grid = [
[null, null, null, null, null, null, null, null],
['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b'],
['b', 'b', 'b', 'b', 'b', 'b', 'b', 'b'],
[null, null, null, null, null, null, null, null],
[null, null, null, null, null, null, null, null],
['g', 'g', 'g', 'g', 'g', 'g', 'g', 'g'],
['g', 'g', 'g', 'g', 'g', 'g', 'g', 'g'],
[null, null, null, null, null, null, null, null]
];

function draw() {
container.innerHTML = '';
for(let r=0; r<8; r++) {
for(let c=0; c<8; c++) {
const sq = document.createElement('div');
sq.className = 'sq ' + ((r+c)%2==0 ? 'sq-l' : 'sq-d');
if(grid[r][c]) {
const p = document.createElement('div');
p.className = 'p ' + (grid[r][c] == 'g' ? 'p-g' : 'p-b');
if(sel && sel.r == r && sel.c == c) p.classList.add('sel');
sq.appendChild(p);
}
sq.onclick = () => {
if(grid[r][c] == turn) {
sel = {r, c};
} else if(sel && !grid[r][c]) {
if(Math.abs(r - sel.r) + Math.abs(c - sel.c) == 1) {
grid[r][c] = turn;
grid[sel.r][sel.c] = null;
turn = (turn == 'g' ? 'b' : 'g');
sel = null;
status.innerText = "SIRA: " + (turn == 'g' ? 'ALTIN' : 'MAVİ');
status.style.color = (turn == 'g' ? 'gold' : '#3b82f6');
}
}
draw();
};
container.appendChild(sq);
}
}
}
draw();
