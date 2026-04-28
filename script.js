// ============================================================
//  CHECKPOINT 22 — A Jornada de Renan
//  Endless Runner — presente de aniversário 28/04/2026
// ============================================================

// ---- CANVAS & CTX ----
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');

// ---- DOM REFS ----
const hudEl          = document.getElementById('hud');
const scoreEl        = document.getElementById('score-display');
const hiScoreEl      = document.getElementById('hi-score-display');
const phaseEl        = document.getElementById('phase-display');
const startScreen    = document.getElementById('start-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const birthdayScreen = document.getElementById('birthday-screen');
const goScoreText    = document.getElementById('go-score-text');
const goPhaseText    = document.getElementById('go-phase-text');
const announceEl     = document.getElementById('phase-announce');
const announceNameEl = document.getElementById('phase-announce-name');
const announceSubEl  = document.getElementById('phase-announce-sub');
const btnRestart     = document.getElementById('btn-restart');
const btnPlayAgain   = document.getElementById('btn-play-again');

// ---- CONSTANTS ----
const GRAVITY      = 0.6;
const JUMP_FORCE   = -14;
const BASE_SPEED   = 2.8;
const MAX_SPEED    = 4.8;
// Limiares de fase — cada fase dura ~40-50 s de jogo real (score pausa na transição)
const PHASE_THRESHOLDS = [2100, 3900]; // score para avançar fase 0→1 e 1→2  (~35s / ~30s / ~30s)
const BIRTHDAY_SCORE   = 6000;         // score para tela de aniversário (~35s fase 3)

// ---- STATE ENUM ----
const S = { START:'start', PLAYING:'playing', DEAD:'dead', BDAY:'bday' };
let state = S.START;

// ---- GAME VARIABLES ----
let score      = 0;
let hiScore    = 0;
let gameSpeed  = BASE_SPEED;
let frameCount = 0;
let phaseIdx   = 0;       // 0,1,2
let particles  = [];
let clouds     = [];
let bgDecor    = [];
let obstacles  = [];
let nextObs          = 90;
let invincible       = false;
let transitioning    = false;
let birthdayLaunched = false;
let _lastTs = 0;
let DT = 1;

// ---- DIMENSIONS (preenchidos em resize) ----
let W, H, groundY;

// ---- PLAYER ----
const P = {
    x: 0, y: 0, w: 38, h: 52,
    vy: 0, onGround: false,
    legPhase: 0,      // 0..3 para animação de corrida
    legTimer: 0,
    squishY: 1,       // animação de aterrissar
};

// ---- PHASES CONFIG ----
const PHASES = [
    {
        name:     'Ensino Médio',
        sub:      'Os desafios da adolescência',
        skyA:     '#3a86c8', skyB: '#87CEEB',
        groundG:  '#5a9a3c', groundD: '#7B5D3A',
        obsTypes: ['prova','livro','pressao','duvida','livro','prova'],
        minGap: 90, maxGap: 170,
    },
    {
        name:     'IFPB — Administração',
        sub:      'Nem todo caminho é definitivo',
        skyA:     '#1a7a4a', skyB: '#5DBB7A',
        groundG:  '#3a7a2c', groundD: '#5A4A2A',
        obsTypes: ['indecisao','materia','pressao','prova','materia'],
        minGap: 80, maxGap: 155,
    },
    {
        name:     'UFPB — História',
        sub:      'Paixão pelo que faz + esforço',
        skyA:     '#250050', skyB: '#7B3FAD',
        groundG:  '#2a3a7a', groundD: '#1A1A3A',
        obsTypes: ['cansaco','noite','livro','seminario','aula','livro','seminario','aula'],
        minGap: 70, maxGap: 140,
    },
];

// ---- OBSTACLE TYPES ----
const OBS = {
    prova:     { label:'Prova!',     color:'#FF4444', dark:'#880000', w:26, h:34, shape:'paper'    },
    livro:     { label:'Livros',     color:'#8B4513', dark:'#3D1A00', w:22, h:38, shape:'book'     },
    pressao:   { label:'Pressão',    color:'#CC2244', dark:'#660011', w:30, h:30, shape:'spikes'   },
    duvida:    { label:'Dúvidas',    color:'#E0A000', dark:'#7A5000', w:24, h:42, shape:'sign'     },
    indecisao: { label:'Indecisão',  color:'#FF8C00', dark:'#7A4000', w:28, h:36, shape:'tri'      },
    materia:   { label:'Matéria',    color:'#9932CC', dark:'#4B006E', w:22, h:36, shape:'book'     },
    cansaco:   { label:'Cansaço',    color:'#555577', dark:'#222233', w:30, h:28, shape:'rect'      },
    noite:     { label:'Sem dormir', color:'#0a0a3a', dark:'#000010', w:32, h:32, shape:'moon'      },
    seminario: { label:'Seminário',  color:'#6A5ACD', dark:'#2E0080', w:30, h:40, shape:'easel'     },
    aula:      { label:'Aula!',      color:'#2D5A27', dark:'#0F1F0C', w:32, h:34, shape:'chalkboard'},
};

// ============================================================
//  RESIZE
// ============================================================
function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
    groundY = H - 62;
    P.x = Math.round(W * 0.12);
    if (!P.onGround) P.y = groundY - P.h;
    else             P.y = groundY - P.h;
    buildClouds();
    buildBgDecor();
}

// ============================================================
//  CLOUDS
// ============================================================
function buildClouds() {
    clouds = [];
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * W,
            y: 20 + Math.random() * (groundY * 0.38),
            w: 40 + Math.random() * 60,
            spd: 0.3 + Math.random() * 0.4,
            alpha: 0.55 + Math.random() * 0.35,
        });
    }
}

function updateClouds() {
    clouds.forEach(c => {
        c.x -= c.spd * (gameSpeed / BASE_SPEED) * DT;
        if (c.x + c.w < 0) {
            c.x = W + 10;
            c.y = 20 + Math.random() * (groundY * 0.38);
            c.w = 40 + Math.random() * 60;
        }
    });
}

function drawCloud(c) {
    ctx.globalAlpha = c.alpha;
    ctx.fillStyle = '#fff';
    const r = c.w * 0.22;
    ctx.beginPath();
    ctx.arc(c.x,        c.y, r,        0, Math.PI*2);
    ctx.arc(c.x+r*1.4,  c.y-r*0.5, r*1.2, 0, Math.PI*2);
    ctx.arc(c.x+r*2.8,  c.y, r*0.9,   0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// ============================================================
//  BACKGROUND DECORATIONS (phase-specific)
// ============================================================
function buildBgDecor() {
    bgDecor = [];
    const ph = PHASES[phaseIdx];
    const count = 4;
    for (let i = 0; i < count; i++) {
        bgDecor.push({ x: (W / count) * i + Math.random() * (W/count), phase: phaseIdx });
    }
}

function updateBgDecor() {
    bgDecor.forEach(d => {
        d.x -= (gameSpeed * 0.15) * DT;
        if (d.x < -120) {
            d.x = W + Math.random() * 80;
            d.phase = phaseIdx;
        }
    });
}

function drawBgDecor(d) {
    if (d.phase === 0) drawSchoolBuilding(d.x);
    else if (d.phase === 1) drawUnivBuilding(d.x);
    else drawLibrary(d.x);
}

function drawSchoolBuilding(x) {
    // Prédio da escola no fundo
    const bh = groundY * 0.5;
    const by = groundY - bh;
    ctx.fillStyle = 'rgba(180,160,120,0.25)';
    ctx.fillRect(x, by, 80, bh);
    // janelas
    ctx.fillStyle = 'rgba(200,230,255,0.3)';
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++)
            ctx.fillRect(x + 8 + col*24, by + 10 + row*20, 14, 12);
    // telhado triangular
    ctx.fillStyle = 'rgba(140,100,60,0.25)';
    ctx.beginPath();
    ctx.moveTo(x - 10, by);
    ctx.lineTo(x + 40, by - 28);
    ctx.lineTo(x + 90, by);
    ctx.fill();
}

function drawUnivBuilding(x) {
    // Campus universitário — edifício maior, palmeiras
    const bh = groundY * 0.6;
    const by = groundY - bh;
    ctx.fillStyle = 'rgba(100,160,100,0.22)';
    ctx.fillRect(x, by, 70, bh);
    ctx.fillStyle = 'rgba(150,255,150,0.18)';
    for (let row = 0; row < 4; row++)
        for (let col = 0; col < 2; col++)
            ctx.fillRect(x + 8 + col*30, by + 10 + row*18, 18, 12);
    // Palmeira ao lado
    const px = x + 80;
    ctx.fillStyle = 'rgba(80,140,60,0.3)';
    ctx.fillRect(px + 4, groundY - 60, 4, 60);
    ctx.beginPath();
    ctx.arc(px + 6, groundY - 58, 16, 0, Math.PI*2);
    ctx.fill();
}

function drawLibrary(x) {
    // Biblioteca — estante de livros no fundo
    const bh = groundY * 0.55;
    const by = groundY - bh;
    ctx.fillStyle = 'rgba(60,40,80,0.3)';
    ctx.fillRect(x, by, 90, bh);
    // prateleiras
    const colors = ['rgba(180,80,40,0.3)','rgba(60,60,160,0.3)','rgba(40,140,60,0.3)','rgba(160,40,60,0.3)'];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
            ctx.fillStyle = colors[(row+col) % colors.length];
            ctx.fillRect(x + 4 + col*14, by + 8 + row*20, 11, 18);
        }
    }
}

// ============================================================
//  BACKGROUND DRAW
// ============================================================
function drawBackground() {
    const ph = PHASES[phaseIdx];

    // Gradiente de céu
    const grad = ctx.createLinearGradient(0,0,0,groundY);
    grad.addColorStop(0, ph.skyA);
    grad.addColorStop(1, ph.skyB);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, groundY);

    // Elementos de fundo
    bgDecor.forEach(drawBgDecor);

    // Nuvens
    clouds.forEach(drawCloud);

    // Faixa de grama / chão visual
    ctx.fillStyle = ph.groundG;
    ctx.fillRect(0, groundY, W, 12);

    // Solo
    ctx.fillStyle = ph.groundD;
    ctx.fillRect(0, groundY + 12, W, H - groundY - 12);

    // Linha de pontos no chão (estilo runner)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let x = (frameCount * gameSpeed) % 40; x < W; x += 40) {
        ctx.fillRect(x, groundY + 6, 22, 3);
    }
}

// ============================================================
//  PLAYER DRAW (pixel art)
// ============================================================
function drawPlayer() {
    const px = Math.round(P.x - P.w / 2);
    const py = Math.round(P.y);
    const sq = P.squishY;
    const pw = P.w;
    const ph = Math.round(P.h * sq);
    const oy = Math.round(P.h * (1 - sq)); // offset quando amassado

    ctx.save();
    ctx.translate(px, py + oy);

    // ------ Tênis brancos ------
    const legF = P.legPhase;
    const offL = P.onGround ? [Math.sin(legF) * 5, Math.cos(legF + Math.PI) * 5] : [0, 0];
    ctx.fillStyle = '#EEE';
    // pé esquerdo
    roundRect(ctx, 3 + offL[0], ph - 10, 13, 9, 3);
    ctx.fill();
    // pé direito
    roundRect(ctx, pw - 17 + offL[1], ph - 10, 13, 9, 3);
    ctx.fill();
    // sola cinza
    ctx.fillStyle = '#aaa';
    ctx.fillRect(4 + offL[0], ph - 5, 11, 4);
    ctx.fillRect(pw - 16 + offL[1], ph - 5, 11, 4);

    // ------ Bermuda preta ------
    ctx.fillStyle = '#111';
    roundRect(ctx, 4, ph - 22, pw - 8, 14, 3);
    ctx.fill();
    // detalhe bermuda
    ctx.fillStyle = '#333';
    ctx.fillRect(pw/2 - 1, ph - 22, 2, 14);

    // ------ Braço traseiro (esquerdo — atrás do corpo) ------
    // Braços balançam oposto às pernas: braço esquerdo para frente quando perna direita avança
    const armSwing = P.onGround ? Math.sin(legF) * 0.52 : 0.18;
    ctx.save();
    ctx.translate(pw / 2 - 6, ph - 40 * sq);
    ctx.rotate(armSwing);
    ctx.fillStyle = '#E8E8E8'; // manga oversize
    roundRect(ctx, -3, 0, 7, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#C68B5A'; // mão
    roundRect(ctx, -2, 10, 5, 6, 2);
    ctx.fill();
    ctx.restore();

    // ------ Camisa branca oversize ------
    ctx.fillStyle = '#F5F5F5';
    roundRect(ctx, 1, ph - 44 * sq, pw - 2, 24 * sq, 4);
    ctx.fill();
    // sombra da camisa
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(2, ph - 42 * sq, pw - 4, 4);
    // gola
    ctx.fillStyle = '#ddd';
    ctx.fillRect(pw/2 - 4, ph - 44 * sq, 8, 4);

    // ------ Braço frontal (direito — na frente do corpo) ------
    ctx.save();
    ctx.translate(pw / 2 + 6, ph - 40 * sq);
    ctx.rotate(-armSwing);
    ctx.fillStyle = '#F0F0F0'; // manga (levemente diferente para dar profundidade)
    roundRect(ctx, -3, 0, 7, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#C68B5A'; // mão
    roundRect(ctx, -2, 10, 5, 6, 2);
    ctx.fill();
    ctx.restore();

    // ------ Pescoço ------
    ctx.fillStyle = '#C68B5A';
    ctx.fillRect(pw/2 - 3, ph - 50 * sq, 6, 6 * sq);

    // ------ Cabeça ------
    const headH = 20 * sq;
    const headY = ph - 50 * sq - headH + 2;
    ctx.fillStyle = '#C68B5A';
    roundRect(ctx, pw/2 - 9, headY, 18, headH, 5);
    ctx.fill();

    // orelhas
    ctx.fillStyle = '#B87C4E';
    ctx.fillRect(pw/2 - 11, headY + 5, 3, 6);
    ctx.fillRect(pw/2 + 8,  headY + 5, 3, 6);

    // ------ Cabelo castanho surfista ------
    ctx.fillStyle = '#5A3010';
    // topo do cabelo
    roundRect(ctx, pw/2 - 10, headY - 5, 20, 10, 4);
    ctx.fill();
    // mechas para os lados (estilo surfista)
    ctx.beginPath();
    ctx.moveTo(pw/2 - 10, headY - 2);
    ctx.bezierCurveTo(pw/2 - 18, headY + 4, pw/2 - 15, headY + 10, pw/2 - 10, headY + 8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(pw/2 + 10, headY - 2);
    ctx.bezierCurveTo(pw/2 + 18, headY + 4, pw/2 + 15, headY + 10, pw/2 + 10, headY + 8);
    ctx.fill();
    // franja
    ctx.fillStyle = '#6B3D18';
    ctx.beginPath();
    ctx.moveTo(pw/2 - 7, headY - 1);
    ctx.quadraticCurveTo(pw/2, headY + 3, pw/2 + 7, headY - 1);
    ctx.fill();

    // ------ Olhos ------
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(pw/2 - 6, headY + 6 * sq, 4, 4 * sq);
    ctx.fillRect(pw/2 + 2,  headY + 6 * sq, 4, 4 * sq);
    // brilho nos olhos
    ctx.fillStyle = '#fff';
    ctx.fillRect(pw/2 - 5, headY + 6 * sq, 2, 2 * sq);
    ctx.fillRect(pw/2 + 3,  headY + 6 * sq, 2, 2 * sq);

    // ------ Boca / sorriso ------
    ctx.fillStyle = '#8B4530';
    ctx.beginPath();
    ctx.arc(pw/2, headY + 13 * sq, 3, 0.1, Math.PI - 0.1);
    ctx.fill();

    ctx.restore();
}

// Helper: rounded rect
function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
}

// ============================================================
//  OBSTACLE DRAW
// ============================================================
function drawObstacle(ob) {
    const t = OBS[ob.type];
    const x = Math.round(ob.x);
    const y = Math.round(ob.y);
    const w = ob.w;
    const h = ob.h;

    switch (t.shape) {
        case 'paper':
            // Folha de prova
            ctx.fillStyle = '#fff';
            roundRect(ctx, x, y, w, h, 2);
            ctx.fill();
            ctx.fillStyle = t.color;
            ctx.fillRect(x+3, y+5, w-6, 3);
            ctx.fillRect(x+3, y+11, w-6, 3);
            ctx.fillRect(x+3, y+17, w-10, 3);
            ctx.fillRect(x+3, y+23, w-8, 3);
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 1.5;
            roundRect(ctx, x, y, w, h, 2);
            ctx.stroke();
            // selo vermelho de reprovação
            ctx.fillStyle = '#FF0000';
            ctx.font = `bold ${Math.round(w*0.45)}px monospace`;
            ctx.fillText('✗', x + w*0.25, y + h*0.8);
            break;

        case 'book':
            // Livro/apostila
            ctx.fillStyle = t.color;
            roundRect(ctx, x, y, w, h, 2);
            ctx.fill();
            ctx.fillStyle = t.dark;
            ctx.fillRect(x+3, y, 4, h);
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for (let i = 1; i < 5; i++) ctx.fillRect(x+4, y + (h/5)*i, w-8, 1);
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 1.5;
            roundRect(ctx, x, y, w, h, 2);
            ctx.stroke();
            break;

        case 'spikes':
            // Bola com espinhos (pressão)
            ctx.fillStyle = t.dark;
            ctx.beginPath();
            ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(x + w/2, y + h/2, w/2 - 3, 0, Math.PI*2);
            ctx.fill();
            // espinhos
            ctx.fillStyle = t.dark;
            for (let i = 0; i < 8; i++) {
                const ang = (i / 8) * Math.PI * 2;
                const cx = x + w/2 + Math.cos(ang) * (w/2 - 2);
                const cy = y + h/2 + Math.sin(ang) * (w/2 - 2);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8);
                ctx.lineTo(cx + Math.cos(ang + 0.3) * 3, cy + Math.sin(ang + 0.3) * 3);
                ctx.fill();
            }
            break;

        case 'sign':
            // Placa de interrogação (dúvida)
            ctx.fillStyle = t.color;
            roundRect(ctx, x, y, w, h - 10, 4);
            ctx.fill();
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 2;
            roundRect(ctx, x, y, w, h - 10, 4);
            ctx.stroke();
            // poste
            ctx.fillStyle = t.dark;
            ctx.fillRect(x + w/2 - 2, y + h - 10, 4, 10);
            // ?
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.round(w*0.7)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('?', x + w/2, y + h - 16);
            ctx.textAlign = 'left';
            break;

        case 'tri':
            // Triângulo (indecisão — dois caminhos)
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.moveTo(x + w/2, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.round(w*0.55)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('?', x + w/2, y + h - 8);
            ctx.textAlign = 'left';
            break;

        case 'rect':
            // Bloco de cansaço (cinza com "zzz")
            ctx.fillStyle = t.color;
            roundRect(ctx, x, y, w, h, 4);
            ctx.fill();
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 2;
            roundRect(ctx, x, y, w, h, 4);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = `bold ${Math.round(w*0.4)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('zzz', x + w/2, y + h/2 + 4);
            ctx.textAlign = 'left';
            break;

        case 'moon':
            // Lua / noite sem dormir
            ctx.fillStyle = t.color;
            ctx.beginPath();
            ctx.arc(x + w/2, y + h/2, w/2, 0, Math.PI*2);
            ctx.fill();
            // lua crescente
            ctx.fillStyle = PHASES[phaseIdx].skyA;
            ctx.beginPath();
            ctx.arc(x + w/2 + 6, y + h/2 - 4, w/2 - 4, 0, Math.PI*2);
            ctx.fill();
            // estrelas ao redor
            ctx.fillStyle = '#FFD700';
            const stars = [[x-6,y+4],[x+w+2,y+8],[x+w/2,y-6]];
            stars.forEach(([sx,sy]) => {
                ctx.font = '8px monospace';
                ctx.fillText('★', sx, sy);
            });
            break;

        case 'easel':
            // Cavalete de seminário / apresentação
            ctx.fillStyle = t.dark;
            roundRect(ctx, x + 2, y, w - 4, h - 14, 2);
            ctx.fill();
            ctx.fillStyle = t.color;
            roundRect(ctx, x + 4, y + 2, w - 8, h - 18, 2);
            ctx.fill();
            // "slides" no quadro
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.fillRect(x + 7, y + 6,  w - 14, 3);
            ctx.fillRect(x + 7, y + 12, w - 18, 3);
            ctx.fillRect(x + 7, y + 18, w - 16, 3);
            // mini gráfico de barras
            ctx.fillStyle = 'rgba(255,220,80,0.5)';
            ctx.fillRect(x + 7,      y + h - 22, 4, 6);
            ctx.fillRect(x + 13,     y + h - 24, 4, 8);
            ctx.fillRect(x + 19,     y + h - 20, 4, 4);
            // pernas do cavalete
            ctx.strokeStyle = t.dark;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + w/2 - 2, y + h - 14);
            ctx.lineTo(x + 5, y + h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + w/2 + 2, y + h - 14);
            ctx.lineTo(x + w - 5, y + h);
            ctx.stroke();
            break;

        case 'chalkboard':
            // Lousa de aula
            ctx.fillStyle = t.dark;
            roundRect(ctx, x, y, w, h, 3);
            ctx.fill();
            ctx.fillStyle = t.color;
            roundRect(ctx, x + 3, y + 3, w - 6, h - 9, 2);
            ctx.fill();
            // escrita na lousa (linhas de giz)
            ctx.fillStyle = 'rgba(255,255,255,0.65)';
            ctx.fillRect(x + 6, y + 8,  w - 12, 2);
            ctx.fillRect(x + 6, y + 14, w - 16, 2);
            ctx.fillRect(x + 6, y + 20, w - 10, 2);
            ctx.fillRect(x + 6, y + 26, w - 14, 2);
            // giz na moldura inferior
            ctx.fillStyle = '#eee';
            ctx.fillRect(x + 5, y + h - 5, 9, 3);
            ctx.fillRect(x + 16, y + h - 5, 6, 3);
            break;
    }

    // Label acima do obstáculo
    ctx.save();
    ctx.font = `${Math.round(Math.max(7, W*0.012))}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(t.label, x + w/2, y - 6);
    ctx.fillText(t.label, x + w/2, y - 6);
    ctx.restore();
}

// ============================================================
//  PARTICLES
// ============================================================
function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 5 - 2,
            alpha: 1,
            color,
            size: 3 + Math.random() * 4,
            life: 0.9 + Math.random() * 0.3,
        });
    }
}

function updateParticles() {
    particles = particles.filter(p => p.alpha > 0.02);
    particles.forEach(p => {
        p.x += p.vx * DT;
        p.y += p.vy * DT;
        p.vy += 0.18 * DT;
        p.alpha -= (0.03 / p.life) * DT;
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

// ============================================================
//  SCORE / PHASE / HUD
// ============================================================
function updateScore() {
    // Score e velocidade pausam durante transição/contagem — sem "skip" de fase acidental
    if (transitioning) return;

    score += DT;
    scoreEl.textContent = Math.floor(score);
    if (score > hiScore) {
        hiScore = score;
        hiScoreEl.textContent = 'REC: ' + Math.floor(hiScore);
    }

    // Velocidade sobe com o progresso real (score), não com o tempo de tela
    gameSpeed = Math.min(MAX_SPEED, BASE_SPEED + score * 0.00016);

    // Avanço de fase — guards explícitos, sem risco de multi-trigger
    if (phaseIdx === 0 && score >= PHASE_THRESHOLDS[0]) {
        phaseIdx = 1;
        onPhaseChange();
    } else if (phaseIdx === 1 && score >= PHASE_THRESHOLDS[1]) {
        phaseIdx = 2;
        onPhaseChange();
    } else if (phaseIdx === 2 && score >= BIRTHDAY_SCORE && !birthdayLaunched) {
        birthdayLaunched = true;
        launchBirthday();
    }
}

// Exibe o anúncio e a contagem regressiva de qualquer fase (usada no início e nas transições)
function showPhaseIntro() {
    const ph = PHASES[phaseIdx];
    phaseEl.textContent = ph.name;

    obstacles     = [];
    transitioning = true;
    invincible    = true;
    nextObs       = 99999;

    announceNameEl.textContent = ph.name;
    announceSubEl.textContent  = ph.sub;
    announceEl.classList.remove('hidden');
    announceEl.classList.remove('counting');

    soundPhaseIntro();
    setTimeout(() => startPhaseCountdown(), 3500);
}

function onPhaseChange() {
    buildBgDecor();
    for (let i = 0; i < 8; i++)
        spawnParticles(W * Math.random(), groundY * Math.random() * 0.7, '#FFD700', 6);
    showPhaseIntro();
}

function startPhaseCountdown() {
    announceNameEl.textContent = 'Preparado?';
    announceEl.classList.add('counting');

    let count = 3;
    announceSubEl.textContent = count;

    const tick = setInterval(() => {
        count--;
        if (count > 0) {
            announceSubEl.textContent = count;
            soundTick();
        } else {
            clearInterval(tick);
            announceEl.classList.add('hidden');
            announceEl.classList.remove('counting');
            invincible    = false;
            transitioning = false;
            nextObs       = 80;
            soundGo();
        }
    }, 900);
}

// ============================================================
//  OBSTACLES
// ============================================================
function spawnObstacle() {
    const ph    = PHASES[phaseIdx];
    const types = ph.obsTypes;
    const type  = types[Math.floor(Math.random() * types.length)];
    const t     = OBS[type];

    // Às vezes spawn de dupla — obstáculos grudados (lidos como um bloco único)
    const double = Math.random() < 0.14;

    obstacles.push({
        type,
        x: W + 10,
        y: groundY - t.h,
        w: t.w,
        h: t.h,
    });
    if (double) {
        obstacles.push({
            type,
            x: W + 10 + t.w + 3, // 3px de respiro visual, hitbox se funde
            y: groundY - t.h,
            w: t.w,
            h: t.h,
        });
    }

    const ph2 = PHASES[phaseIdx];
    nextObs = ph2.minGap + Math.random() * (ph2.maxGap - ph2.minGap);
    // Velocidade afeta intervalo mínimo
    nextObs = Math.max(nextObs * (BASE_SPEED / gameSpeed), 55);
}

function updateObstacles() {
    obstacles.forEach(ob => { ob.x -= gameSpeed * DT; });
    obstacles = obstacles.filter(ob => ob.x + ob.w > -10);

    if (!transitioning) {
        nextObs -= DT;
        if (nextObs <= 0) spawnObstacle();
    }
}

// ============================================================
//  COLLISION
// ============================================================
function checkCollision() {
    if (invincible) return false;

    const px = P.x - P.w * 0.5 + 11; // hitbox bem menor que o sprite (mais perdoador)
    const py = P.y + 10;
    const pw = P.w - 22;
    const ph = P.h - 18;

    for (const ob of obstacles) {
        const ox = ob.x + 8;
        const oy = ob.y + 7;
        const ow = ob.w - 16;
        const oh = ob.h - 10;

        if (px < ox + ow && px + pw > ox &&
            py < oy + oh && py + ph > oy) {
            return true;
        }
    }
    return false;
}

// ============================================================
//  PLAYER UPDATE
// ============================================================
function updatePlayer() {
    // Gravidade com delta time
    P.vy += GRAVITY * DT;
    P.y  += P.vy * DT;

    // Chão
    if (P.y >= groundY - P.h) {
        if (P.vy > 3) {
            P.squishY = 0.75;
            spawnParticles(P.x, groundY, PHASES[phaseIdx].groundG, 4);
        }
        P.y = groundY - P.h;
        P.vy = 0;
        P.onGround = true;
    } else {
        P.onGround = false;
    }

    // Recupera squish
    P.squishY += (1 - P.squishY) * 0.25 * DT;

    // Animação das pernas
    if (P.onGround) {
        P.legTimer += DT;
        if (P.legTimer >= 7) {
            P.legTimer = 0;
            P.legPhase = (P.legPhase + 0.8) % (Math.PI * 2);
        }
    } else {
        P.legPhase = Math.PI * 0.3; // pernas dobradas no pulo
    }
}

// ============================================================
//  JUMP
// ============================================================
function jump() {
    ensureAudio();
    if (state === S.START) {
        startGame();
        return;
    }
    if (state === S.DEAD || state === S.BDAY) return;
    if (P.onGround) {
        P.vy = JUMP_FORCE;
        P.onGround = false;
        spawnParticles(P.x, groundY, '#fff', 5);
        soundJump();
    }
}

// ============================================================
//  GAME OVER
// ============================================================
function triggerGameOver() {
    state = S.DEAD;
    soundHit();

    // Partículas de colisão
    for (let i = 0; i < 18; i++)
        spawnParticles(P.x, P.y + P.h/2, '#FF4444', 1);

    goScoreText.textContent = 'Pontuação: ' + score;
    goPhaseText.textContent  = 'Fase: ' + PHASES[phaseIdx].name;

    setTimeout(() => {
        gameoverScreen.classList.remove('hidden');
    }, 600);
}

// ============================================================
//  BIRTHDAY SCREEN
// ============================================================
function launchBirthday() {
    state = S.BDAY;
    hudEl.classList.add('hidden');
    birthdayScreen.classList.remove('hidden');
    initBirthdayCanvas();
    setTimeout(() => {
        soundBirthday();
        setInterval(soundBirthday, 8000); // repete enquanto tela estiver ativa
    }, 800);
}

function initBirthdayCanvas() {
    const bc = document.getElementById('birthday-canvas');
    bc.width  = bc.offsetWidth;
    bc.height = bc.offsetHeight;
    const bctx = bc.getContext('2d');
    const bw   = bc.width;
    const bh   = bc.height;

    // Fundo dourado
    const grad = bctx.createLinearGradient(0,0,0,bh);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#16213e');
    grad.addColorStop(1, '#0f3460');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, bw, bh);

    // Confete contínuo
    const confetti = Array.from({length: 80}, () => ({
        x: Math.random() * bw,
        y: Math.random() * bh,
        vx: (Math.random()-0.5)*2,
        vy: 1 + Math.random()*2,
        color: ['#FFD700','#FF6B6B','#7FDBFF','#2ECC71','#FF69B4','#FFA500'][Math.floor(Math.random()*6)],
        size: 4 + Math.random()*6,
        angle: Math.random()*360,
        spin: (Math.random()-0.5)*4,
    }));

    // Estrelas de fundo
    const stars = Array.from({length: 60}, () => ({
        x: Math.random()*bw, y: Math.random()*bh,
        r: 0.5 + Math.random()*2,
        alpha: 0.3 + Math.random()*0.7,
        pulse: Math.random()*Math.PI*2,
    }));

    let bdayFrame = 0;
    function bdayLoop() {
        if (state !== S.BDAY) return;
        bdayFrame++;

        // Fundo
        bctx.fillStyle = grad;
        bctx.fillRect(0,0,bw,bh);

        // Estrelas
        stars.forEach(s => {
            s.pulse += 0.04;
            const a = s.alpha * (0.5 + 0.5 * Math.sin(s.pulse));
            bctx.globalAlpha = a;
            bctx.fillStyle = '#FFD700';
            bctx.beginPath();
            bctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
            bctx.fill();
        });
        bctx.globalAlpha = 1;

        // Confete
        confetti.forEach(c => {
            c.x += c.vx;
            c.y += c.vy;
            c.angle += c.spin;
            if (c.y > bh) { c.y = -10; c.x = Math.random()*bw; }

            bctx.save();
            bctx.translate(c.x, c.y);
            bctx.rotate(c.angle * Math.PI/180);
            bctx.fillStyle = c.color;
            bctx.fillRect(-c.size/2, -c.size/4, c.size, c.size/2);
            bctx.restore();
        });

        // Desenha professor formado (pixel art simples)
        drawGraduate(bctx, bw * 0.91, bh * 0.30, bh * 0.24);

        requestAnimationFrame(bdayLoop);
    }
    bdayLoop();
}

function drawGraduate(c, cx, cy, size) {
    const s = size / 100;

    c.save();
    c.translate(cx, cy);

    // Toga preta
    c.fillStyle = '#1a1a1a';
    roundRect(c, -20*s, -35*s, 40*s, 50*s, 4*s);
    c.fill();

    // Listras douradas na toga
    c.fillStyle = '#FFD700';
    c.fillRect(-15*s, -20*s, 30*s, 3*s);
    c.fillRect(-15*s, -10*s, 30*s, 3*s);

    // Pescoço
    c.fillStyle = '#C68B5A';
    c.fillRect(-4*s, -42*s, 8*s, 8*s);

    // Cabeça
    c.fillStyle = '#C68B5A';
    roundRect(c, -14*s, -62*s, 28*s, 22*s, 6*s);
    c.fill();

    // Cabelo castanho
    c.fillStyle = '#5A3010';
    roundRect(c, -15*s, -66*s, 30*s, 12*s, 5*s);
    c.fill();

    // Capelo (chapéu de formatura)
    c.fillStyle = '#111';
    c.fillRect(-18*s, -70*s, 36*s, 6*s);
    c.fillRect(-8*s, -80*s, 16*s, 12*s);
    // cordão dourado
    c.fillStyle = '#FFD700';
    c.fillRect(8*s, -68*s, 2*s, 14*s);

    // Olhos
    c.fillStyle = '#111';
    c.fillRect(-8*s, -56*s, 4*s, 4*s);
    c.fillRect(3*s, -56*s, 4*s, 4*s);

    // Sorriso
    c.fillStyle = '#8B4530';
    c.beginPath();
    c.arc(0, -47*s, 5*s, 0.1, Math.PI - 0.1);
    c.fill();

    // Diploma na mão
    c.fillStyle = '#fff';
    roundRect(c, 18*s, -25*s, 22*s, 16*s, 2*s);
    c.fill();
    c.strokeStyle = '#FFD700';
    c.lineWidth = 1.5*s;
    roundRect(c, 18*s, -25*s, 22*s, 16*s, 2*s);
    c.stroke();
    c.fillStyle = '#FFD700';
    c.font = `${Math.round(7*s)}px monospace`;
    c.textAlign = 'center';
    c.fillText('★', 29*s, -14*s);

    // Texto "PROFESSOR" embaixo
    c.fillStyle = '#FFD700';
    c.font = `bold ${Math.round(9*s)}px 'Press Start 2P', monospace`;
    c.textAlign = 'center';
    c.fillText('PROFESSOR', 0, 25*s);

    c.restore();
}

// ============================================================
//  SONS (Web Audio API — sem arquivos externos)
// ============================================================
let _ac = null;
function getAC() {
    if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
    return _ac;
}
function ensureAudio() {
    try { const a = getAC(); if (a.state === 'suspended') a.resume(); } catch(e) {}
}

// Gerador de tom base — freq, tipo, duração, volume, delay, freqFinal (opcional)
function tone(freq, type, dur, vol, delay = 0, freqEnd = null) {
    try {
        const a   = getAC();
        const osc = a.createOscillator();
        const g   = a.createGain();
        osc.connect(g); g.connect(a.destination);
        osc.type = type;
        const t = a.currentTime + delay;
        osc.frequency.setValueAtTime(freq, t);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur + 0.02);
    } catch(e) {}
}

function soundJump() {
    tone(260, 'square', 0.13, 0.22, 0, 520);
}

function soundHit() {
    tone(200, 'sawtooth', 0.07, 0.4);
    tone(130, 'sawtooth', 0.13, 0.3, 0.07);
    tone(70,  'sawtooth', 0.18, 0.2, 0.20);
}

function soundPhaseIntro() {
    // Arpejo ascendente — sinaliza nova fase
    [[262,0],[330,0.10],[392,0.20],[523,0.32],[784,0.46]].forEach(([f,d]) => {
        tone(f, 'square', 0.18, 0.22, d);
    });
}

function soundTick() {
    tone(440, 'square', 0.07, 0.18);
}

function soundGo() {
    tone(880,  'square', 0.12, 0.28);
    tone(1174, 'square', 0.10, 0.22, 0.13);
}

function soundBirthday() {
    // "Parabéns pra você" (melodia simplificada em Sol maior)
    // G G A G C B | G G A G D C | G G G' E C B A | F F E C D C
    const m = [
        392,0.17, 392,0.08, 440,0.25, 392,0.25, 523,0.25, 494,0.48, 0,0.18,
        392,0.17, 392,0.08, 440,0.25, 392,0.25, 587,0.25, 523,0.48, 0,0.18,
        392,0.17, 392,0.08, 784,0.25, 659,0.25, 523,0.25, 494,0.17, 440,0.35, 0,0.12,
        698,0.17, 698,0.08, 659,0.25, 523,0.25, 587,0.25, 523,0.55,
    ];
    let t = 0;
    for (let i = 0; i < m.length; i += 2) {
        const f = m[i], d = m[i + 1];
        if (f > 0) tone(f, 'triangle', d * 0.88, 0.2, t);
        t += d + 0.02;
    }
}

// ============================================================
//  START / RESET
// ============================================================
function startGame() {
    score     = 0;
    phaseIdx  = 0;
    gameSpeed = BASE_SPEED;
    frameCount = 0;
    obstacles  = [];
    particles  = [];
    nextObs          = 100;
    invincible       = false;
    transitioning    = false;
    birthdayLaunched = false;
    P.y  = groundY - P.h;
    P.vy = 0;
    P.onGround = true;
    P.squishY  = 1;
    P.legPhase = 0;

    state = S.PLAYING;
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    birthdayScreen.classList.add('hidden');
    hudEl.classList.remove('hidden');

    scoreEl.textContent = '0';

    buildClouds();
    buildBgDecor();

    // Mostra intro da fase 1 antes de qualquer obstáculo aparecer
    showPhaseIntro();
}

// ============================================================
//  MAIN LOOP
// ============================================================
function loop(ts) {
    DT = (_lastTs && ts) ? Math.min((ts - _lastTs) / 16.67, 3) : 1;
    _lastTs = ts || _lastTs;
    frameCount++;

    ctx.clearRect(0, 0, W, H);

    if (state === S.PLAYING) {
        updatePlayer();
        updateObstacles();
        updateClouds();
        updateBgDecor();
        updateParticles();
        updateScore();

        if (checkCollision()) triggerGameOver();
    }

    if (state !== S.BDAY) {
        drawBackground();
        drawParticles();
        obstacles.forEach(drawObstacle);
        drawPlayer();

        if (state === S.START) {
            P.legPhase += 0.08 * DT;
        }

        if (state === S.PLAYING && P.onGround && frameCount % 8 === 0) {
            spawnParticles(P.x - P.w * 0.5, groundY - 4, PHASES[phaseIdx].groundG, 2);
        }
    }

    requestAnimationFrame(loop);
}

// ============================================================
//  INPUT
// ============================================================
document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
    }
});

window.addEventListener('touchstart', e => {
    e.preventDefault();
    jump();
}, { passive: false });

btnRestart.addEventListener('click', () => {
    gameoverScreen.classList.add('hidden');
    startGame();
});

btnPlayAgain.addEventListener('click', () => {
    birthdayScreen.classList.add('hidden');
    state = S.START;
    startScreen.classList.remove('hidden');
    hudEl.classList.add('hidden');
});

// Botão de pulo mobile — disparo via touch e click (fallback desktop)
const jumpBtn = document.getElementById('jump-btn');
jumpBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation(); // evita duplo disparo com o listener do window
    jump();
}, { passive: false });
jumpBtn.addEventListener('mousedown', e => {
    jump(); // fallback para testes em desktop
});

// ============================================================
//  ROTATE OVERLAY — detecção JS (mais confiável que media query)
// ============================================================
const rotateOverlay = document.getElementById('rotate-overlay');

function checkOrientation() {
    const isTouch   = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const isPortrait = window.innerHeight > window.innerWidth;
    rotateOverlay.style.display = (isTouch && isPortrait) ? 'flex' : 'none';
}

// ============================================================
//  INIT
// ============================================================
window.addEventListener('resize', () => {
    checkOrientation();
    resize();
    if (state === S.BDAY) {
        const bc = document.getElementById('birthday-canvas');
        bc.width  = bc.offsetWidth;
        bc.height = bc.offsetHeight;
    }
});

window.addEventListener('orientationchange', checkOrientation);

window.addEventListener('load', () => {
    checkOrientation();
    resize();
    P.y = groundY - P.h;
    loop();
});




