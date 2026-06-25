
        // Firebase 配置 - 請替換為你的配置
        const firebaseConfig = {
            apiKey: "AIzaSyDXv8yQ-ycAVGk-0cmg0wtbypuLsw83DJY",
            authDomain: "goodbaby-points.firebaseapp.com",
            projectId: "goodbaby-points",
            storageBucket: "goodbaby-points.firebasestorage.app",
            messagingSenderId: "91241395721",
            appId: "1:91241395721:web:7bd00c4b7f253ca137ead8",
            measurementId: "G-TRL178XR8R"
        };
        
        // 初始化 Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // DOM 元素
        const elements = {
            authContainer: document.getElementById('authContainer'),
            familySetupContainer: document.getElementById('familySetupContainer'),
            mainPage: document.getElementById('mainPage'),
            childDetailPage: document.getElementById('childDetailPage'),
            childrenContainer: document.getElementById('childrenContainer'),
            recordsContainer: document.getElementById('recordsContainer'),
            rewardsContainer: document.getElementById('rewardsContainer'),
            commonReasonsList: document.getElementById('commonReasonsList'),
            reasonOptionsDatalist: document.getElementById('reasonOptions'),
            emailInput: document.getElementById('emailInput'),
            passwordInput: document.getElementById('passwordInput'),
            authErrorMsg: document.getElementById('authErrorMsg'),
            familyCodeInput: document.getElementById('familyCodeInput'),
            familyCodeDisplay: document.getElementById('familyCodeDisplay'),
            currentFamilyCode: document.getElementById('currentFamilyCode'),
            childNameInput: document.getElementById('childName'),
            recordReasonInput: document.getElementById('recordReason'),
            recordPointsInput: document.getElementById('recordPoints'),
            goalReasonInput: document.getElementById('goalReason'),
            goalPointsInput: document.getElementById('goalPoints'),
            rewardNameInput: document.getElementById('rewardNameInput'),
            rewardCostInput: document.getElementById('rewardCostInput'),
            addUpdateRewardBtn: document.getElementById('addUpdateRewardBtn'),
            cancelEditRewardBtn: document.getElementById('cancelEditRewardBtn'),
            signOutBtn: document.getElementById('signOutBtn'),
            currentFamilyCodeDisplay: document.querySelector('.family-code-display')
        };

        // 應用狀態
        let appState = {
            user: null,
            familyId: null,
            userRole: null,
            currentChildId: null,
            currentEditingRewardId: null,
            unsubscribeFromFamily: null,
            appData: {
                children: [],
                commonReasons: [],
                rewardsList: []
            }
        };

        // 工具函數
        const utils = {
            generateUniqueId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            },

            formatTime(timestamp) {
                try {
                    const date = new Date(timestamp);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const hour = date.getHours().toString().padStart(2, '0');
                    const minute = date.getMinutes().toString().padStart(2, '0');
                    return `${year}-${month}-${day} ${hour}:${minute}`;
                } catch (error) { 
                    return '時間未知'; 
                }
            },

            displayAuthError(message) {
                elements.authErrorMsg.textContent = message;
                elements.authErrorMsg.style.display = 'block';
            },

            hideAllPages() {
                elements.authContainer.style.display = 'none';
                elements.familySetupContainer.style.display = 'none';
                elements.mainPage.style.display = 'none';
                elements.childDetailPage.style.display = 'none';
                elements.signOutBtn.style.display = 'none';
            },

            saveData() {
                if (appState.familyId) {
                    db.collection('families').doc(appState.familyId).set(appState.appData)
                        .catch(error => console.error("Error writing family data:", error));
                }
            }
        };

        // UI 更新函數
        const ui = {
            updateVisibility() {
                const isAdmin = appState.userRole === 'admin';
                document.getElementById('addChildSection').style.display = isAdmin ? 'block' : 'none';
                document.getElementById('goalsSection').style.display = isAdmin ? 'block' : 'none';
                document.getElementById('addRecordSection').style.display = isAdmin ? 'block' : 'none';
                document.getElementById('reasonOptionsSection').style.display = isAdmin ? 'block' : 'none';
                document.getElementById('rewardsSection').style.display = isAdmin ? 'block' : 'none';
                document.getElementById('redeemGoalBtn').style.display = isAdmin ? 'inline-block' : 'none';
                document.getElementById('deleteGoalBtn').style.display = isAdmin ? 'inline-block' : 'none';
            },

            renderChildren() {
                const sortedChildren = [...appState.appData.children].sort((a, b) => b.points - a.points);
                if (appState.appData.children.length === 0) {
                    elements.childrenContainer.innerHTML = `
                        <div class="empty-state">
                            <div>🎈</div>
                            <p>還沒有新增任何小孩，快來新增第一個寶貝吧！</p>
                        </div>
                    `;
                } else {
                    elements.childrenContainer.innerHTML = sortedChildren.map((child, index) => `
                        <div class="child-item" data-id="${child.id}">
                            <div class="child-name">
                                ${index === 0 && child.points > 0 ? '👑 ' : ''}${child.name}
                            </div>
                            <div class="child-points">${child.points}</div>
                            <div class="action-buttons" style="${appState.userRole !== 'admin' ? 'display: none;' : ''}">
                                <button class="edit-child-btn" data-id="${child.id}">✏️</button>
                                <button class="delete-child-btn" data-id="${child.id}">🗑️</button>
                            </div>
                        </div>
                    `).join('');
                }
            },

            renderRecords() {
                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                const records = child?.records || [];
                if (records.length === 0) {
                    elements.recordsContainer.innerHTML = `
                        <div class="empty-state">
                            <div>📝</div>
                            <p>還沒有任何記錄</p>
                        </div>
                    `;
                    return;
                }
                elements.recordsContainer.innerHTML = records.map(record => `
                    <div class="record-item" data-id="${record.id}">
                        <div class="record-info">
                            <div class="record-reason">${record.reason}</div>
                            <div class="record-time">${utils.formatTime(record.timestamp)}</div>
                        </div>
                        <div class="record-points ${record.points > 0 ? 'positive' : 'negative'}">
                            ${record.points > 0 ? '+' : ''}${record.points}
                        </div>
                        <button class="delete-record" data-id="${record.id}" title="刪除記錄" style="${appState.userRole !== 'admin' ? 'display: none;' : ''}">
                            🗑️
                        </button>
                    </div>
                `).join('');
            },

            renderRewards() {
                if (appState.appData.rewardsList.length === 0) {
                    elements.rewardsContainer.innerHTML = `
                        <div class="empty-state">
                            <div>🎁</div>
                            <p>沒有可兌換的獎勵</p>
                        </div>
                    `;
                    return;
                }
                elements.rewardsContainer.innerHTML = appState.appData.rewardsList.map(reward => `
                    <div class="reward-item" data-id="${reward.id}">
                        <div class="reward-info">
                            <div class="reward-name">${reward.name}</div>
                            <div class="reward-price">${reward.cost} 點</div>
                        </div>
                        <div class="action-buttons" style="${appState.userRole !== 'admin' ? 'display: none;' : ''}">
                            <button class="edit-btn" data-id="${reward.id}">✏️</button>
                            <button class="delete-btn" data-id="${reward.id}">🗑️</button>
                        </div>
                    </div>
                `).join('');
            },

            renderCommonReasons() {
                elements.commonReasonsList.innerHTML = appState.appData.commonReasons.map(reason => `
                    <li>
                        ${reason}
                        <span class="delete-reason" data-reason="${reason}" style="${appState.userRole !== 'admin' ? 'display: none;' : ''}">×</span>
                    </li>
                `).join('');
                elements.reasonOptionsDatalist.innerHTML = appState.appData.commonReasons.map(reason => `
                    <option value="${reason}"></option>
                `).join('');
            },

            renderGoals() {
                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                const goalSection = document.getElementById('goalSection');
                const goalText = document.getElementById('goalText');
                const goalProgressBar = document.getElementById('goalProgressBar');

                if (child.goal && child.goal.points > 0) {
                    const progress = Math.min(100, (child.points / child.goal.points) * 100);
                    goalText.textContent = `目標：${child.goal.reason} (${child.points} / ${child.goal.points} 點)`;
                    goalProgressBar.style.width = `${progress}%`;
                    goalSection.style.display = 'block';
                    if (appState.userRole === 'admin') {
                        document.getElementById('deleteGoalBtn').style.display = 'inline-block';
                        document.getElementById('redeemGoalBtn').style.display = child.points >= child.goal.points ? 'inline-block' : 'none';
                    }
                } else {
                    goalSection.style.display = 'none';
                }
            },

            showChildDetail(childId) {
                const child = appState.appData.children.find(c => c.id === childId);
                if (!child) return;
                appState.currentChildId = childId;
                document.getElementById('detailChildName').textContent = child.name;
                document.getElementById('detailChildPoints').textContent = child.points;
                elements.mainPage.style.display = 'none';
                elements.childDetailPage.style.display = 'block';
                this.renderRecords();
                this.renderGoals();
            },

            resetRewardForm() {
                elements.rewardNameInput.value = '';
                elements.rewardCostInput.value = '';
                elements.addUpdateRewardBtn.textContent = '新增';
                elements.addUpdateRewardBtn.classList.remove('btn-secondary');
                elements.addUpdateRewardBtn.classList.add('btn-primary');
                elements.cancelEditRewardBtn.style.display = 'none';
                appState.currentEditingRewardId = null;
            }
        };

        // 資料管理
        const dataManager = {
            subscribeToFamilyData(familyId) {
                if (appState.unsubscribeFromFamily) {
                    appState.unsubscribeFromFamily();
                }
                appState.familyId = familyId;
                elements.currentFamilyCode.textContent = familyId;
                elements.currentFamilyCodeDisplay.style.display = 'flex';

                appState.unsubscribeFromFamily = db.collection('families').doc(familyId)
                    .onSnapshot(doc => {
                        if (doc.exists) {
                            appState.appData = doc.data();
                            if (!appState.appData.children) appState.appData.children = [];
                            if (!appState.appData.commonReasons) appState.appData.commonReasons = [];
                            if (!appState.appData.rewardsList) appState.appData.rewardsList = [];
                            
                            ui.renderChildren();
                            ui.renderRewards();
                            ui.renderCommonReasons();
                            ui.updateVisibility();

                            if (appState.currentChildId) {
                                ui.showChildDetail(appState.currentChildId);
                            } else {
                                elements.mainPage.style.display = 'block';
                                elements.childDetailPage.style.display = 'none';
                            }
                            elements.familySetupContainer.style.display = 'none';
                        } else {
                            elements.familySetupContainer.style.display = 'flex';
                            elements.mainPage.style.display = 'none';
                            elements.childDetailPage.style.display = 'none';
                            console.warn("家庭資料不存在，導向家庭設定頁面。");
                        }
                    }, error => {
                        console.error("Firestore snapshot error:", error);
                        alert("載入資料失敗，請檢查網路或重新登入。");
                    });
                
                elements.signOutBtn.style.display = 'block';
            }
        };

        // 事件處理器
        const eventHandlers = {
            addChild() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                const name = elements.childNameInput.value.trim();
                if (!name) { 
                    alert('請輸入小孩姓名！'); 
                    return; 
                }
                if (appState.appData.children.some(child => child.name === name)) { 
                    alert('這個名稱已經存在了！'); 
                    return; 
                }
                appState.appData.children.push({ 
                    id: utils.generateUniqueId(), 
                    name: name, 
                    points: 0, 
                    records: [], 
                    goal: null 
                });
                elements.childNameInput.value = '';
                utils.saveData();
            },

            addRecord() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                
                const reason = elements.recordReasonInput.value.trim();
                const pointsInput = elements.recordPointsInput.value.trim();
                
                if (!reason) { 
                    alert('請輸入加扣點原因！'); 
                    return; 
                }
                
                if (!pointsInput) { 
                    alert('請輸入點數！'); 
                    return; 
                }
                
                const points = parseInt(pointsInput);
                
                if (isNaN(points)) { 
                    alert('請輸入有效的數字！'); 
                    return; 
                }
                
                if (points > 100 || points < -100) { 
                    alert('點數範圍應在 -100 到 +100 之間！'); 
                    return; 
                }
                
                if (points === 0) {
                    if (!confirm('點數為0，確定要新增這筆記錄嗎？')) {
                        return;
                    }
                }

                if (!appState.appData.commonReasons.includes(reason)) {
                    appState.appData.commonReasons.unshift(reason);
                    if (appState.appData.commonReasons.length > 10) { 
                        appState.appData.commonReasons.pop(); 
                    }
                }

                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                if (!child) return;

                const newRecord = { 
                    id: utils.generateUniqueId(), 
                    reason, 
                    points, 
                    timestamp: new Date().toISOString() 
                };

                child.records.unshift(newRecord);
                child.points += points;

                elements.recordReasonInput.value = '';
                elements.recordPointsInput.value = '';

                utils.saveData();
            },

            setGoal() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                const reason = elements.goalReasonInput.value.trim();
                const points = parseInt(elements.goalPointsInput.value);
                if (!reason || !points || points <= 0) { 
                    alert('請輸入有效的目標名稱和點數！'); 
                    return; 
                }
                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                if (!child) return;
                child.goal = { reason, points };
                elements.goalReasonInput.value = '';
                elements.goalPointsInput.value = '';
                utils.saveData();
            },

            redeemGoal() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                if (!child || !child.goal) return;
                if (child.points < child.goal.points) {
                    alert('點數不足，無法兌換！');
                    return;
                }
                if (confirm(`確定要兌換「${child.goal.reason}」並將點數歸零嗎？`)) {
                    const goalReason = child.goal.reason;
                    const goalPoints = child.goal.points;
                    child.points -= goalPoints;
                    child.goal = null;
                    child.records.unshift({ 
                        id: utils.generateUniqueId(), 
                        reason: `兌換了目標: ${goalReason}`, 
                        points: -goalPoints, 
                        timestamp: new Date().toISOString() 
                    });
                    utils.saveData();
                }
            },

            deleteGoal() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                if (!child || !child.goal) return;
                if (confirm(`確定要刪除「${child.goal.reason}」這個目標嗎？`)) {
                    child.goal = null;
                    utils.saveData();
                }
            },

            addUpdateReward() {
                if (appState.userRole !== 'admin') { 
                    alert("你沒有權限進行此操作。"); 
                    return; 
                }
                const name = elements.rewardNameInput.value.trim();
                const cost = parseInt(elements.rewardCostInput.value);
                if (!name || isNaN(cost) || cost <= 0) {
                    alert('請輸入有效的獎勵名稱和點數！');
                    return;
                }
                if (appState.currentEditingRewardId) {
                    const rewardIndex = appState.appData.rewardsList.findIndex(r => r.id === appState.currentEditingRewardId);
                    if (rewardIndex !== -1) {
                        appState.appData.rewardsList[rewardIndex].name = name;
                        appState.appData.rewardsList[rewardIndex].cost = cost;
                    }
                } else {
                    appState.appData.rewardsList.push({ id: utils.generateUniqueId(), name, cost });
                }
                utils.saveData();
                ui.resetRewardForm();
            }
        };

        // 初始化事件監聽器
        const initializeEventListeners = () => {
            // 認證相關
            document.getElementById('signUpBtn').addEventListener('click', () => {
                const email = elements.emailInput.value;
                const password = elements.passwordInput.value;
                auth.createUserWithEmailAndPassword(email, password)
                    .then(() => {
                        elements.authErrorMsg.style.display = 'none';
                    })
                    .catch((error) => {
                        let errorMessage = '註冊失敗。';
                        switch (error.code) {
                            case 'auth/email-already-in-use':
                                errorMessage = '此電子郵件已被註冊。';
                                break;
                            case 'auth/weak-password':
                                errorMessage = '密碼強度不足，請輸入至少6位數密碼。';
                                break;
                            case 'auth/invalid-email':
                                errorMessage = '電子郵件格式無效。';
                                break;
                        }
                        utils.displayAuthError(errorMessage);
                    });
            });

            document.getElementById('signInBtn').addEventListener('click', () => {
                const email = elements.emailInput.value;
                const password = elements.passwordInput.value;
                auth.signInWithEmailAndPassword(email, password)
                    .then(() => {
                        elements.authErrorMsg.style.display = 'none';
                    })
                    .catch((error) => {
                        let errorMessage = '登入失敗。';
                        switch (error.code) {
                            case 'auth/invalid-email':
                                errorMessage = '電子郵件格式無效。';
                                break;
                            case 'auth/user-disabled':
                                errorMessage = '此帳號已被停用。';
                                break;
                            case 'auth/user-not-found':
                            case 'auth/wrong-password':
                                errorMessage = '電子郵件或密碼錯誤。';
                                break;
                        }
                        utils.displayAuthError(errorMessage);
                    });
            });

            elements.signOutBtn.addEventListener('click', () => {
                auth.signOut().then(() => {
                    alert("已成功登出。");
                }).catch(error => {
                    console.error("Sign Out Error:", error);
                    alert("登出失敗，請稍後再試。");
                });
            });

            // 家庭設定相關
            document.getElementById('createFamilyBtn').addEventListener('click', () => {
                const newFamilyId = utils.generateUniqueId();
                db.collection('users').doc(appState.user.uid).set({ familyId: newFamilyId, role: 'admin' }).then(() => {
                    return db.collection('families').doc(newFamilyId).set({
                        children: [],
                        commonReasons: [],
                        rewardsList: [],
                    });
                }).then(() => {
                    elements.familyCodeDisplay.textContent = `你的家庭代碼是：${newFamilyId}`;
                    elements.familyCodeDisplay.style.display = 'block';
                    appState.userRole = 'admin';
                    dataManager.subscribeToFamilyData(newFamilyId);
                }).catch(error => {
                    console.error("Error creating family:", error);
                    alert("建立家庭失敗，請稍後再試。");
                });
            });

            document.getElementById('joinFamilyBtn').addEventListener('click', () => {
                const inputCode = elements.familyCodeInput.value.trim();
                if (!inputCode) {
                    alert("請輸入家庭代碼！");
                    return;
                }
                
                db.collection('families').doc(inputCode).get().then(doc => {
                    if (doc.exists) {
                        const is_admin = confirm("你是這個家庭的管理員嗎？\n\n是 (確定): 你將有權限修改點數、新增小孩和獎勵。\n否 (取消): 你只能查看點數，沒有修改權限。");
                        const role = is_admin ? 'admin' : 'member';
                        appState.userRole = role;

                        return db.collection('users').doc(appState.user.uid).set({ familyId: inputCode, role: role }).then(() => {
                            dataManager.subscribeToFamilyData(inputCode);
                        });
                    } else {
                        alert("家庭代碼無效，請重新檢查。");
                    }
                }).catch(error => {
                    console.error("Error joining family:", error);
                    alert("加入家庭失敗，請稍後再試。");
                });
            });

            // 主要功能按鈕
            document.getElementById('addChildBtn').addEventListener('click', eventHandlers.addChild);
            document.getElementById('addRecordBtn').addEventListener('click', eventHandlers.addRecord);
            document.getElementById('setGoalBtn').addEventListener('click', eventHandlers.setGoal);
            document.getElementById('redeemGoalBtn').addEventListener('click', eventHandlers.redeemGoal);
            document.getElementById('deleteGoalBtn').addEventListener('click', eventHandlers.deleteGoal);
            elements.addUpdateRewardBtn.addEventListener('click', eventHandlers.addUpdateReward);
            elements.cancelEditRewardBtn.addEventListener('click', ui.resetRewardForm);

            // 複製家庭代碼
            document.getElementById('copyCodeBtn').addEventListener('click', () => {
                const code = elements.currentFamilyCode.textContent;
                navigator.clipboard.writeText(code).then(() => {
                    alert('家庭代碼已複製到剪貼簿！');
                }).catch(err => {
                    console.error('複製失敗: ', err);
                });
            });

            // 返回主頁面
            document.getElementById('backToMainBtn').addEventListener('click', () => {
                appState.currentChildId = null;
                elements.mainPage.style.display = 'block';
                elements.childDetailPage.style.display = 'none';
            });

            // 鍵盤事件
            elements.childNameInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') eventHandlers.addChild(); 
            });
            elements.recordReasonInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') eventHandlers.addRecord(); 
            });
            elements.recordPointsInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') eventHandlers.addRecord(); 
            });
            elements.goalPointsInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') eventHandlers.setGoal(); 
            });
            elements.emailInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') elements.passwordInput.focus(); 
            });
            elements.passwordInput.addEventListener('keypress', (e) => { 
                if (e.key === 'Enter') document.getElementById('signInBtn').click(); 
            });

            // 委派事件處理
            elements.childrenContainer.addEventListener('click', (e) => {
                const childItem = e.target.closest('.child-item');
                if (!childItem) return;
                
                const editBtn = e.target.closest('.edit-child-btn');
                const deleteBtn = e.target.closest('.delete-child-btn');
                const childId = childItem.dataset.id;
                const child = appState.appData.children.find(c => c.id === childId);
                if (!child) return;

                if (editBtn) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    const newName = prompt("請輸入小孩的新姓名：", child.name);
                    if (newName && newName.trim() !== "") {
                        child.name = newName.trim();
                        utils.saveData();
                    }
                } else if (deleteBtn) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    if (confirm("確定要刪除這個小孩及其所有記錄嗎？此操作無法復原！")) {
                        appState.appData.children = appState.appData.children.filter(c => c.id !== childId);
                        utils.saveData();
                    }
                } else {
                    ui.showChildDetail(childId);
                }
            });

            elements.recordsContainer.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-record');
                if (deleteBtn && confirm('確定要刪除這筆記錄嗎？')) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    const recordId = deleteBtn.dataset.id;
                    const child = appState.appData.children.find(c => c.id === appState.currentChildId);
                    if (!child) return;
                    const recordIndex = child.records.findIndex(r => r.id === recordId);
                    if (recordIndex === -1) return;
                    const record = child.records[recordIndex];
                    child.points -= record.points;
                    child.records.splice(recordIndex, 1);
                    utils.saveData();
                }
            });

            elements.rewardsContainer.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-btn');
                const deleteBtn = e.target.closest('.delete-btn');
                if (editBtn) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    const rewardId = editBtn.dataset.id;
                    const reward = appState.appData.rewardsList.find(r => r.id === rewardId);
                    if (reward) {
                        elements.rewardNameInput.value = reward.name;
                        elements.rewardCostInput.value = reward.cost;
                        elements.addUpdateRewardBtn.textContent = '更新';
                        elements.addUpdateRewardBtn.classList.remove('btn-primary');
                        elements.addUpdateRewardBtn.classList.add('btn-secondary');
                        elements.cancelEditRewardBtn.style.display = 'inline-block';
                        appState.currentEditingRewardId = rewardId;
                        elements.rewardNameInput.focus();
                    }
                } else if (deleteBtn) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    const rewardId = deleteBtn.dataset.id;
                    if (confirm('確定要刪除這個獎勵嗎？')) {
                        appState.appData.rewardsList = appState.appData.rewardsList.filter(r => r.id !== rewardId);
                        utils.saveData();
                        ui.resetRewardForm();
                    }
                }
            });

            elements.commonReasonsList.addEventListener('click', (e) => {
                const deleteBtn = e.target.closest('.delete-reason');
                if (deleteBtn) {
                    if (appState.userRole !== 'admin') { 
                        alert("你沒有權限進行此操作。"); 
                        return; 
                    }
                    const reasonToDelete = deleteBtn.dataset.reason;
                    appState.appData.commonReasons = appState.appData.commonReasons.filter(reason => reason !== reasonToDelete);
                    utils.saveData();
                }
            });

            // 快速點數按鈕
            document.querySelector('.quick-points-buttons').addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-point-btn')) {
                    const points = e.target.dataset.points;
                    elements.recordPointsInput.value = points;
                }
            });
        };

        // Firebase 認證狀態監聽
        auth.onAuthStateChanged(user => {
            utils.hideAllPages();
            if (user) {
                appState.user = user;
                elements.signOutBtn.style.display = 'block';

                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists && doc.data().familyId) {
                        appState.familyId = doc.data().familyId;
                        appState.userRole = doc.data().role;
                        dataManager.subscribeToFamilyData(appState.familyId);
                    } else {
                        elements.familySetupContainer.style.display = 'flex';
                    }
                }).catch(error => {
                    console.error("Error getting user document:", error);
                    alert("載入使用者資料失敗，請檢查網路或重新登入。");
                });

            } else {
                appState.user = null;
                appState.familyId = null;
                appState.userRole = null;
                elements.authContainer.style.display = 'flex';
                if (appState.unsubscribeFromFamily) {
                    appState.unsubscribeFromFamily();
                }
            }
        });

        // 初始化應用程式
        const initializeApp = () => {
            initializeEventListeners();
        };

        // 當頁面載入完成後初始化
        document.addEventListener('DOMContentLoaded', initializeApp);
    