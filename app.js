// app.js - minimal dice PWA logic
const MAX_DICE = 4;
const DIE_TYPES = [4,6,8,10,12,20];
const diceList = document.getElementById('diceList');
const addBtn = document.getElementById('addDie');
const rollAllBtn = document.getElementById('rollAll');
const totalSumEl = document.getElementById('totalSum');

let dice = []; // array of die objects {id, type, value, state}

let nextId = 1;

// create initial die (in "choose type" mode)
addDie(true);

addBtn.addEventListener('click', ()=> addDie(true));
rollAllBtn.addEventListener('click', rollAllSequence);

function addDie(startWithChooser=false){
  if (dice.length >= MAX_DICE) return;
  const id = nextId++;
  const die = { id, type: 6, value: null, rolling:false };
  dice.push(die);
  renderDie(die, startWithChooser);
  updateControls();
  updateSum();
}

function removeDie(id){
  const idx = dice.findIndex(d=>d.id===id);
  if (idx === -1) return;
  dice.splice(idx,1);
  const el = document.querySelector(`.die[data-id="${id}"]`);
  if (el) el.remove();
  updateControls();
  updateSum();
}

function updateControls(){
  addBtn.disabled = dice.length >= MAX_DICE;
  rollAllBtn.disabled = dice.length === 0;
}

function renderDie(die, showChooser=false){
  // create DOM
  const el = document.createElement('section');
  el.className = 'die';
  el.dataset.id = die.id;

  // header
  const head = document.createElement('div');
  head.className = 'die-head';
  const label = document.createElement('div');
  label.className = 'die-label';
  label.innerHTML = `<span>Type</span> <strong class="type-display">${die.type}</strong>`;
  const right = document.createElement('div');
  right.className = 'die-actions';
  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.innerText = '−';
  remove.title = 'Remove die';
  remove.addEventListener('click', ()=> removeDie(die.id));
  right.appendChild(remove);
  head.appendChild(label);
  head.appendChild(right);

  // main area
  const main = document.createElement('div');
  main.className = 'die-main';

  // roll button
  const rollBtn = document.createElement('button');
  rollBtn.className = 'roll-btn';
  rollBtn.setAttribute('aria-busy','false');
  rollBtn.innerText = showChooser ? 'Pick' : 'Roll';
  rollBtn.addEventListener('click', ()=>{
    // If chooser is visible, ignore clicks (user must pick type first)
    if (die.chooser && die.chooser.style.display !== 'none') return;

    // If it's currently rolling, ignore further clicks
    if (die.rolling) return;

    // If there is a final value shown (the die is inverted) -> treat as "reset to Roll" action:
    // user requested "press the number so it goes back to roll"
    if (typeof die.value === 'number') {
      die.value = null;
      if (die.el) die.el.classList.remove('inverted');
      rollBtn.innerText = 'Roll';
      updateSum();
      return;
    }

    // Normal roll action
    rollDie(die.id);
  });


  // type chooser
  const chooser = document.createElement('div');
  chooser.className = 'type-chooser';
  DIE_TYPES.forEach(n=>{
    const b = document.createElement('button');
    b.className = 'type-btn';
    b.innerText = n;
    if (n === die.type) b.classList.add('selected');
    b.addEventListener('click', ()=>{
      if (die.rolling) return;
      die.type = n;
      // update display
      el.querySelector('.type-display').innerText = die.type;
      // show roll button now
      chooser.style.display = 'none';
      rollBtn.innerText = 'Roll';
      rollBtn.disabled = false;
      // remove inversion / clear previously shown value when user changes type
      die.value = null;
      el.classList.remove('inverted');
      updateSum();
      // ensure selected style
      chooser.querySelectorAll('.type-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
    });
    chooser.appendChild(b);
  });

  // if showChooser true, show chooser and set roll button to "Pick" and disabled
  if (showChooser){
    rollBtn.innerText = 'Pick';
    rollBtn.disabled = true;
    // chooser visible
    chooser.style.display = 'flex';
  } else {
    chooser.style.display = 'none';
  }

  main.appendChild(rollBtn);
  main.appendChild(chooser);

  el.appendChild(head);
  el.appendChild(main);

  // append to diceList (we keep column-reverse so append = top)
  diceList.appendChild(el);

  // store ref on element for ease
  die.el = el;
  die.rollBtn = rollBtn;
  die.chooser = chooser;
  die.labelEl = el.querySelector('.type-display');
  die.removeBtn = remove;

  // if not chooser: clicking label allows editing type when not rolling
  el.querySelector('.type-display').addEventListener('click', ()=>{
    if (die.rolling) return;
    chooser.style.display = 'flex';
    rollBtn.innerText = 'Pick';
    rollBtn.disabled = true;
  });
}

function rollDie(id){
  const die = dice.find(d=>d.id===id);
  if (!die || die.rolling) return;

  // invert behavior: only most recent inverted
  dice.forEach(d => {
    if (d.el) d.el.classList.remove('inverted');
  });

  die.rolling = true;
  die.rollBtn.setAttribute('aria-busy','true');
  die.rollBtn.disabled = true; // prevent extra clicks during animation
  // hide chooser while rolling
  if (die.chooser) die.chooser.style.display = 'none';

  // press animation
  die.rollBtn.classList.add('roll-press');

  // rolling animation that slows down toward end (duration 3000ms)
  const duration = 3000;
  const steps = 40; // visual updates
  const easeFactor = 2.6; // controls slowdown curve
  // create delays that sum to duration using easing
  const raw = [];
  for (let i=0;i<steps;i++){
    const t = i / (steps - 1);
    const v = 1 + easeFactor * (t*t); // increasing
    raw.push(v);
  }
  const totalRaw = raw.reduce((a,b)=>a+b,0);
  const delays = raw.map(r => (r / totalRaw) * duration);

  // animation sequence
  let current = 0;
  const startTs = Date.now();
  function step(){
    if (!die.rolling) return;
    const randomVal = Math.floor(Math.random() * die.type) + 1;
    die.rollBtn.innerText = randomVal;
    current++;
    if (current < delays.length){
      setTimeout(step, delays[current]);
    } else {
      // final result: uniform random from 1..type
      const final = Math.floor(Math.random() * die.type) + 1;
      die.value = final;
      die.rollBtn.innerText = final;
      die.el.classList.add('inverted'); // invert only this die
      // update total sum
      updateSum();
      // vibrate briefly if supported
      if (navigator.vibrate) navigator.vibrate(60);
      // cleanup
      die.rolling = false;
      die.rollBtn.setAttribute('aria-busy','false');
      die.rollBtn.disabled = false; // allow click (which will now reset or roll per handler)
      die.rollBtn.classList.remove('roll-press');
      // after roll, allow type editing by clicking type display
    }
  }

  // small UX: start the first step immediately then schedule next with delays[0]
  die.rollBtn.innerText = '...';
  setTimeout(step, 60); // tiny delay before animation
}

// roll all sequentially with 1s delay between each start
function rollAllSequence(){
  if (dice.length === 0) return;
  // disable roll all while running
  rollAllBtn.disabled = true;
  let i = dice.length - 1; // because list is column-reverse (last appended is first child) but our array order is append->push so last is newest; we roll in displayed order top->down: dice are displayed reverse; to keep intuitive, we'll start from top (last in array)
  function next(){
    if (i < 0){
      rollAllBtn.disabled = false;
      return;
    }
    const die = dice[i];
    rollDie(die.id);
    i--;
    setTimeout(next, 1000); // 1s between starts (dramatic)
  }
  next();
}

function updateSum(){
  const values = dice.map(d=>d.value || 0);
  const total = values.reduce((a,b)=>a+b,0);
  totalSumEl.innerText = total === 0 ? '—' : String(total);
}

/* Optional: keyboard accessibility: Enter on focused roll button triggers roll */
document.addEventListener('keydown', (ev)=>{
  if (ev.key === 'Enter' || ev.key === ' ') {
    const active = document.activeElement;
    if (active && active.classList.contains('roll-btn') && !active.disabled){
      active.click();
      ev.preventDefault();
    }
  }
});
