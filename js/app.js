// ============================================================
// Goodbaby Points v2.0 - Supabase Version
// ============================================================ */

const SUPABASE_URL = 'https://ybthwoezslwkjuuyirto.supabase.co';
const SUPABASE_KEY = 'sb_publishable_prAmyVYWDibuAqp5DdKYBQ_paFMQqV2';

async function api(path, opts = {}) {
    const res = await fetch(SUPABASE_URL + '/rest/v1' + path, {
        ...opts,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...(opts.headers || {})
        }
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || res.statusText);
    return res.json();
}

const state = {
    familyId: null, role: null, currentChildId: null, editingReward: null,
    data: { children: [], reasons: [], rewards: [] }
};
const $ = id => document.getElementById(id);

const auth = {
    async signUp(email, password) {
        const r = await fetch(SUPABASE_URL + '/auth/v1/signup', {
            method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!r.ok) throw new Error((await r.json()).message || 'sign up failed');
        return r.json();
    },
    async signIn(email, password) {
        const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
            method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!r.ok) throw new Error((await r.json()).message || 'login failed');
        return r.json();
    }
};

const db = {
    async getFamily(id) { return api('/families?id=eq.' + id + '&select=*'); },
    async create(id, data) { return api('/families', { method: 'POST', body: JSON.stringify({ id, data }) }); },
    async update(id, data) { return api('/families?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ data }) }); }
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function formatTime(ts) {
    try { const d = new Date(ts.replace(' ','T')); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
    catch(e) { return 'unknown'; }
}
function show(el, v) { el.style.display = v === false ? 'none' : ''; }
function hide(el) { el.style.display = 'none'; }
async function save() { if (state.familyId) await db.update(state.familyId, state.data); }

// Page control
function showAuth() { show($('authSection')); hide($('familySection')); hide($('mainPage')); hide($('detailPage')); }
function showFamilySetup() { hide($('authSection')); show($('familySection')); hide($('mainPage')); hide($('detailPage')); }
function showMain(hl = false) { hide($('authSection')); hide($('familySection')); show($('mainPage')); hide($('detailPage')); show($('familyCodeDisplay'), hl); renderChildren(); }
function showDetail(childId) {
    hide($('mainPage')); show($('detailPage'));
    state.currentChildId = childId;
    const child = state.data.children.find(c => c.id === childId);
    if (!child) return;
    $('detailName').textContent = child.name;
    $('detailPoints').textContent = child.points;
    show($('goalSection'), !!child.goal);
    renderRecords(); renderGoals(); renderRewards();
}

// Render
function renderChildren() {
    const c = $('childrenContainer');
    if (!state.data.children.length) { c.innerHTML = '<div class="empty-state"><div>\u{1F388}</div><p>还没有新增任何小孩</p></div>'; return; }
    const sorted = [...state.data.children].sort((a,b) => b.points - a.points);
    c.innerHTML = sorted.map((child, i) => {
        const crown = i===0 && child.points>0 ? '\u{1F451} ' : '';
        const btns = state.role==='admin' ? '<div class="action-buttons"><button data-action="edit" data-id="'+child.id+'">\u270F\uFE0F</button><button data-action="delete" data-id="'+child.id+'">\u{1F5D1}\uFE0F</button></div>' : '';
        return '<div class="child-item" data-id="'+child.id+'"><div class="child-name">'+crown+child.name+'</div><div class="child-points">'+child.points+'</div>'+btns+'</div>';
    }).join('');
}

function renderRecords() {
    const c = $('recordsContainer');
    const child = state.data.children.find(x => x.id === state.currentChildId);
    if (!child || !child.records || !child.records.length) { c.innerHTML = '<div class="empty-state"><div>\u{1F4DD}</div><p>还没有任何记录</p></div>'; return; }
    c.innerHTML = child.records.map(r => {
        const del = state.role==='admin' ? '<button class="delete-record-btn" data-id="'+r.id+'">\u{1F5D1}\uFE0F</button>' : '';
        const cls = r.points > 0 ? 'positive' : 'negative';
        const sign = r.points > 0 ? '+' : '';
        return '<div class="record-item" data-id="'+r.id+'"><div class="record-info"><div class="record-reason">'+r.reason+'</div><div class="record-time">'+formatTime(r.timestamp)+'</div></div><div class="record-points '+cls+'">'+sign+r.points+'</div>'+del+'</div>';
    }).join('');
}

function renderGoals() {
    const child = state.data.children.find(x => x.id === state.currentChildId);
    if (!child || !child.goal || child.goal.points <= 0) { hide($('goalSection')); return; }
    show($('goalSection'));
    const pct = Math.min(100, (child.points / child.goal.points) * 100);
    $('goalText').textContent = child.goal.reason + ' (' + child.points + '/' + child.goal.points + ')';
    $('goalProgressBar').style.width = pct + '%';
    if (state.role === 'admin') { show($('deleteGoalBtn')); show($('redeemGoalBtn'), child.points >= child.goal.points); show($('goalSectionInput')); }
    else { hide($('deleteGoalBtn')); hide($('redeemGoalBtn')); hide($('goalSectionInput')); }
}

function renderRewards() {
    show($('rewardSection'), state.role === 'admin');
    const c = $('rewardsContainer');
    if (!state.data.rewards.length) { c.innerHTML = '<div class="empty-state"><div>\u{1F381}</div><p>没有可兑换的奖励</p></div>'; return; }
    c.innerHTML = state.data.rewards.map(r => {
        const btns = state.role==='admin' ? '<div class="action-buttons"><button data-action="edit-reward" data-id="'+r.id+'">\u270F\uFE0F</button><button data-action="delete-reward" data-id="'+r.id+'">\u{1F5D1}\uFE0F</button></div>' : '';
        return '<div class="reward-item" data-id="'+r.id+'"><div class="reward-info"><div class="reward-name">'+r.name+'</div><div class="reward-price">'+r.cost+' 点</div></div>'+btns+'</div>';
    }).join('');
}

function renderReasons() {
    show($('reasonTagsSection'), state.role === 'admin');
    const list = $('commonReasonsList');
    if (!state.data.reasons.length) { list.innerHTML = '<li style="color:#999;">还没有常用原因</li>'; return; }
    list.innerHTML = state.data.reasons.map(r => '<li>'+r+' <span data-reason="'+r+'" class="delete-reason">\u00D7</span></li>').join('');
    $('reasonOptions').innerHTML = state.data.reasons.map(r => '<option value="'+r+'">').join('');
}



// ============================================================
// Init
// ============================================================
async function init() {
    const saved = localStorage.getItem('goodbaby_family');
    const savedRole = localStorage.getItem('goodbaby_role');
    if (saved) {
        state.familyId = saved;
        state.role = savedRole || 'member';
        const result = await db.getFamily(saved);
        if (result && result.length > 0) {
            state.data = result[0].data || { children: [], reasons: [], rewards: [] };
            if (!state.data.children) state.data.children = [];
            if (!state.data.reasons) state.data.reasons = [];
            if (!state.data.rewards) state.data.rewards = [];
            $('currentFamilyCode').textContent = saved;
            showMain(true);
            return;
        }
    }
    showAuth();
}

document.addEventListener('DOMContentLoaded', () => {
    $('signUpBtn').onclick = async () => {
        try {
            await auth.signUp($('emailInput').value, $('passwordInput').value);
            $('authError').style.display = 'none';
            alert('注册成功！请登录。');
        } catch(e) { $('authError').textContent = e.message; $('authError').style.display = 'block'; }
    };

    $('signInBtn').onclick = async () => {
        try {
            await auth.signIn($('emailInput').value, $('passwordInput').value);
            $('authError').style.display = 'none';
            const saved = localStorage.getItem('goodbaby_family');
            if (saved) {
                const result = await db.getFamily(saved);
                if (result && result.length > 0) {
                    state.familyId = saved;
                    state.role = localStorage.getItem('goodbaby_role') || 'member';
                    state.data = result[0].data;
                    $('currentFamilyCode').textContent = saved;
                    showMain(true); return;
                }
            }
            showFamilySetup();
        } catch(e) { $('authError').textContent = e.message; $('authError').style.display = 'block'; }
    };

    $('createFamilyBtn').onclick = async () => {
        const id = uid();
        await db.create(id, { children: [], reasons: [], rewards: [] });
        state.familyId = id; state.role = 'admin';
        localStorage.setItem('goodbaby_family', id);
        localStorage.setItem('goodbaby_role', 'admin');
        $('currentFamilyCode').textContent = id;
        showMain(true);
    };

    $('joinFamilyBtn').onclick = async () => {
        const code = $('familyCodeInput').value.trim();
        if (!code) return alert('请输入家庭代码');
        const isAdmin = confirm('你是管理员吗？\n\n确定 = 有编辑权限\n取消 = 只能查看');
        const role = isAdmin ? 'admin' : 'member';
        const result = await db.getFamily(code);
        if (!result || !result.length) return alert('家庭代码无效');
        state.familyId = code; state.role = role;
        state.data = result[0].data;
        localStorage.setItem('goodbaby_family', code);
        localStorage.setItem('goodbaby_role', role);
        $('currentFamilyCode').textContent = code;
        showMain(true);
    };

    $('logoutBtn').onclick = doLogout;
    $('logoutBtn2').onclick = doLogout;
    function doLogout() { localStorage.clear(); state.familyId=null; state.role=null; state.data={children:[],rewards:[],reasons:[]}; showAuth(); }

    $('copyCodeBtn').onclick = () => { navigator.clipboard.writeText(state.familyId).then(() => alert('已复制！')); };

    $('addChildBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const name = $('childName').value.trim();
        if (!name) return alert('请输入姓名');
        if (state.data.children.some(c => c.name === name)) return alert('此姓名已存在');
        state.data.children.push({ id: uid(), name, points: 0, records: [], goal: null });
        $('childName').value = ''; await save(); renderChildren();
    };

    $('childrenContainer').onclick = async e => {
        const item = e.target.closest('.child-item'); if (!item) return;
        const id = item.dataset.id;
        if (e.target.dataset.action === 'edit') {
            if (state.role !== 'admin') return alert('没有权限');
            const child = state.data.children.find(c => c.id === id);
            const newName = prompt('新姓名：', child.name);
            if (newName && newName.trim()) { child.name = newName.trim(); await save(); renderChildren(); }
        } else if (e.target.dataset.action === 'delete') {
            if (state.role !== 'admin') return alert('没有权限');
            if (confirm('确定删除这个小孩？')) { state.data.children = state.data.children.filter(c => c.id !== id); await save(); renderChildren(); }
        } else { showDetail(id); }
    };

    $('backBtn').onclick = () => showMain(true);

    $('addRecordBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const reason = $('recordReason').value.trim();
        const pts = parseInt($('recordPoints').value);
        if (!reason) return alert('请输入原因');
        if (isNaN(pts) || pts === 0) return alert('请输入有效点数');
        if (Math.abs(pts) > 100) return alert('点数范围 -100 ~ +100');
        if (!state.data.reasons.includes(reason)) { state.data.reasons.unshift(reason); if (state.data.reasons.length > 10) state.data.reasons.pop(); }
        const child = state.data.children.find(c => c.id === state.currentChildId);
        if (!child) return;
        child.records.unshift({ id: uid(), reason, points: pts, timestamp: new Date().toISOString() });
        child.points += pts;
        $('recordReason').value = ''; $('recordPoints').value = '';
        await save(); renderRecords(); renderReasons();
    };

    $('quickPoints').onclick = e => { if (e.target.classList.contains('quick-btn')) $('recordPoints').value = e.target.dataset.points; };

    $('recordsContainer').onclick = async e => {
        const btn = e.target.closest('.delete-record-btn'); if (!btn) return;
        if (state.role !== 'admin') return alert('没有权限');
        if (!confirm('删除这笔记录？')) return;
        const child = state.data.children.find(c => c.id === state.currentChildId);
        const idx = (child.records || []).findIndex(r => r.id === btn.dataset.id);
        if (idx === -1) return;
        child.points -= child.records[idx].points; child.records.splice(idx, 1);
        await save(); renderRecords();
    };

    $('commonReasonsList').onclick = async e => {
        const span = e.target.closest('.delete-reason'); if (!span) return;
        if (state.role !== 'admin') return alert('没有权限');
        state.data.reasons = state.data.reasons.filter(r => r !== span.dataset.reason);
        await save(); renderReasons();
    };

    $('setGoalBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const reason = $('goalReason').value.trim();
        const pts = parseInt($('goalPoints').value);
        if (!reason || !pts || pts <= 0) return alert('请输入有效目标');
        const child = state.data.children.find(c => c.id === state.currentChildId);
        if (!child) return;
        child.goal = { reason, points: pts };
        $('goalReason').value = ''; $('goalPoints').value = '';
        await save(); renderGoals();
    };

    $('redeemGoalBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const child = state.data.children.find(c => c.id === state.currentChildId);
        if (!child || !child.goal) return;
        if (child.points < child.goal.points) return alert('点数不足');
        if (confirm('兑换「' + child.goal.reason + '」并将点数归零？')) {
            const cost = child.goal.points; child.points -= cost; child.goal = null;
            child.records.unshift({ id: uid(), reason: '兑换: ' + child.goal.reason, points: -cost, timestamp: new Date().toISOString() });
            await save(); renderRecords(); renderGoals();
        }
    };

    $('deleteGoalBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const child = state.data.children.find(c => c.id === state.currentChildId);
        if (!child || !child.goal) return;
        if (confirm('删除这个目标？')) { child.goal = null; await save(); renderGoals(); }
    };

    $('addRewardBtn').onclick = async () => {
        if (state.role !== 'admin') return alert('没有权限');
        const name = $('rewardName').value.trim();
        const cost = parseInt($('rewardCost').value);
        if (!name || isNaN(cost) || cost <= 0) return alert('请输入有效资料');
        if (state.editingReward) {
            const r = state.data.rewards.find(x => x.id === state.editingReward);
            if (r) { r.name = name; r.cost = cost; }
            state.editingReward = null; $('addRewardBtn').textContent = '新增'; hide($('cancelRewardBtn'));
        } else { state.data.rewards.push({ id: uid(), name, cost }); }
        $('rewardName').value = ''; $('rewardCost').value = '';
        await save(); renderRewards();
    };

    $('cancelRewardBtn').onclick = () => { state.editingReward=null; $('rewardName').value=''; $('rewardCost').value=''; $('addRewardBtn').textContent='新增'; hide($('cancelRewardBtn')); };

    $('rewardsContainer').onclick = async e => {
        const item = e.target.closest('.reward-item'); if (!item) return;
        const id = item.dataset.id;
        if (e.target.dataset.action === 'edit-reward') {
            if (state.role !== 'admin') return alert('没有权限');
            const r = state.data.rewards.find(x => x.id === id);
            if (r) { $('rewardName').value = r.name; $('rewardCost').value = r.cost; $('addRewardBtn').textContent = '更新'; show($('cancelRewardBtn')); state.editingReward = id; }
        } else if (e.target.dataset.action === 'delete-reward') {
            if (state.role !== 'admin') return alert('没有权限');
            if (confirm('删除这个奖励？')) { state.data.rewards = state.data.rewards.filter(x => x.id !== id); await save(); renderRewards(); }
        }
    };

    $('emailInput').onkeypress = e => { if (e.key==='Enter') $('passwordInput').focus(); };
    $('passwordInput').onkeypress = e => { if (e.key==='Enter') $('signInBtn').click(); };
    $('childName').onkeypress = e => { if (e.key==='Enter') $('addChildBtn').click(); };
    $('goalPoints').onkeypress = e => { if (e.key==='Enter') $('setGoalBtn').click(); };
    $('recordReason').onkeypress = e => { if (e.key==='Enter') $('addRecordBtn').click(); };
    $('recordPoints').onkeypress = e => { if (e.key==='Enter') $('addRecordBtn').click(); };

    init();
});
