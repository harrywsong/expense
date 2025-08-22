// Korean Personal Finance App (가계부) - Firebase Integration
import { auth, db, googleProvider } from './firebase_config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global variables
let currentUser = null;
let mainChart = null;
let dashboardChart = null;

// UI elements
const loadingSpinner = document.getElementById('loading-spinner');
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');

// Authentication functions
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        loadingSpinner.style.display = 'flex';
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        showMessage('로그인 성공', '환영합니다!');
    } catch (error) {
        console.error('Login error:', error);
        let message = '로그인에 실패했습니다.';
        if (error.code === 'auth/user-not-found') {
            message = '등록되지 않은 이메일입니다.';
        } else if (error.code === 'auth/wrong-password') {
            message = '비밀번호가 올바르지 않습니다.';
        } else if (error.code === 'auth/invalid-email') {
            message = '유효하지 않은 이메일 주소입니다.';
        }
        showMessage('로그인 실패', message);
        loadingSpinner.style.display = 'none';
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showMessage('회원가입 실패', '비밀번호가 일치하지 않습니다.');
        return;
    }

    if (password.length < 6) {
        showMessage('회원가입 실패', '비밀번호는 6자 이상이어야 합니다.');
        return;
    }

    try {
        loadingSpinner.style.display = 'flex';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;

        // Initialize user data in Firestore
        await initializeUserData(currentUser.uid);
        showMessage('회원가입 완료', '회원가입이 완료되었습니다. 환영합니다!');
    } catch (error) {
        console.error('Signup error:', error);
        let message = '회원가입에 실패했습니다.';
        if (error.code === 'auth/email-already-in-use') {
            message = '이미 등록된 이메일입니다.';
        } else if (error.code === 'auth/invalid-email') {
            message = '유효하지 않은 이메일 주소입니다.';
        } else if (error.code === 'auth/weak-password') {
            message = '비밀번호가 너무 약합니다.';
        }
        showMessage('회원가입 실패', message);
        loadingSpinner.style.display = 'none';
    }
}

async function handleGoogleSignIn() {
    try {
        loadingSpinner.style.display = 'flex';
        const result = await signInWithPopup(auth, googleProvider);
        currentUser = result.user;

        // Check if this is a new user and initialize data if needed
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) {
            await initializeUserData(currentUser.uid);
        }

        showMessage('로그인 성공', 'Google 계정으로 로그인되었습니다.');
    } catch (error) {
        console.error('Google sign-in error:', error);
        let message = 'Google 로그인에 실패했습니다.';
        if (error.code === 'auth/popup-closed-by-user') {
            message = '로그인이 취소되었습니다.';
        } else if (error.code === 'auth/popup-blocked') {
            message = '팝업이 차단되었습니다. 팝업을 허용해주세요.';
        }
        showMessage('로그인 실패', message);
        loadingSpinner.style.display = 'none';
    }
}

async function handlePasswordReset() {
    const email = document.getElementById('emailInput').value;
    if (!email) {
        showMessage('오류', '이메일을 입력해주세요.');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('비밀번호 재설정', '비밀번호 재설정 이메일이 발송되었습니다.');
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage('오류', '비밀번호 재설정 이메일 발송에 실패했습니다.');
    }
}

async function initializeUserData(uid) {
    try {
        // Create user profile
        await setDoc(doc(db, 'users', uid), {
            email: currentUser.email,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        });

        // Initialize with demo data
        await loadDemoDataForUser(uid);
    } catch (error) {
        console.error('Error initializing user data:', error);
    }
}

// async function loadDemoDataForUser(uid) {
//     const now = new Date();
//     const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
//     const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//     const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
//
//     const demoExpenses = [
//         {
//             userId: uid,
//             type: 'expense',
//             date: `${currentMonth}-01`,
//             description: '마트 장보기',
//             category: '그로서리',
//             amount: 50000,
//             card: 'BMO Debit',
//             month: currentMonth,
//             timestamp: new Date().toISOString()
//         },
//         {
//             userId: uid,
//             type: 'expense',
//             date: `${currentMonth}-03`,
//             description: '카페',
//             category: '외식',
//             amount: 8000,
//             card: '현금',
//             month: currentMonth,
//             timestamp: new Date().toISOString()
//         },
//         {
//             userId: uid,
//             type: 'income',
//             date: `${currentMonth}-01`,
//             description: '월급',
//             category: '급여',
//             amount: 3000000,
//             card: 'TD',
//             month: currentMonth,
//             timestamp: new Date().toISOString()
//         },
//         {
//             userId: uid,
//             type: 'expense',
//             date: `${currentMonth}-05`,
//             description: '주유',
//             category: '주유+주차',
//             amount: 60000,
//             card: 'BMO WJ',
//             month: currentMonth,
//             timestamp: new Date().toISOString()
//         },
//         {
//             userId: uid,
//             type: 'expense',
//             date: `${currentMonth}-07`,
//             description: '휴대폰 요금',
//             category: '고정비용',
//             amount: 45000,
//             card: 'BMO JH',
//             month: currentMonth,
//             timestamp: new Date().toISOString()
//         }
//     ];
//
//     // Add demo expenses
//     for (const expense of demoExpenses) {
//         await addDoc(collection(db, 'expenses'), expense);
//     }
//
//     // Add demo budgets
//     const demoBudgets = [
//         { userId: uid, category: '그로서리', amount: 150000 },
//         { userId: uid, category: '외식', amount: 100000 },
//         { userId: uid, category: '주유+주차', amount: 120000 },
//         { userId: uid, category: '고정비용', amount: 200000 }
//     ];
//
//     for (const budget of demoBudgets) {
//         await setDoc(doc(db, 'budgets', `${uid}_${budget.category}`), budget);
//     }
// }

async function logout() {
    try {
        await signOut(auth);
        currentUser = null;

        // Reset UI
        appContainer.style.display = 'none';
        loginPage.style.display = 'block';

        // Reset forms
        document.getElementById('loginForm').reset();
        document.getElementById('signupForm').reset();

        // Show login form, hide signup form
        document.querySelector('.login-card').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';

        // Destroy charts
        if (mainChart) {
            mainChart.destroy();
            mainChart = null;
        }
        if (dashboardChart) {
            dashboardChart.destroy();
            dashboardChart = null;
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Auth state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showApp();
        loadUserData();
    } else {
        currentUser = null;
        loadingSpinner.style.display = 'none';
        loginPage.style.display = 'block';
        appContainer.style.display = 'none';
    }
});

function showApp() {
    loadingSpinner.style.display = 'none';
    loginPage.style.display = 'none';
    appContainer.style.display = 'flex';

    // Update user info in sidebar
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('user-id').textContent = currentUser.uid.substring(0, 8) + '...';

    // Wait for elements to be visible before rendering dashboard
    setTimeout(() => {
        renderDashboard();
        populateFilterCategories();
        renderBudgetList();
    }, 200);
}

async function loadUserData() {
    // Update user's last login
    try {
        await setDoc(doc(db, 'users', currentUser.uid), {
            lastLogin: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Handle custom category visibility
function handleCategoryChange() {
    const categorySelect = document.getElementById('category');
    const customCategoryGroup = document.getElementById('customCategoryGroup');

    if (categorySelect.value === '기타') {
        customCategoryGroup.style.display = 'block';
        document.getElementById('customCategory').required = true;
    } else {
        customCategoryGroup.style.display = 'none';
        document.getElementById('customCategory').required = false;
        document.getElementById('customCategory').value = '';
    }
}

// Handle edit modal category change
function handleEditCategoryChange() {
    const categorySelect = document.getElementById('edit-category');
    const customCategoryGroup = document.getElementById('editCustomCategoryGroup');

    if (categorySelect.value === '기타') {
        customCategoryGroup.style.display = 'block';
        document.getElementById('editCustomCategory').required = true;
    } else {
        customCategoryGroup.style.display = 'none';
        document.getElementById('editCustomCategory').required = false;
        document.getElementById('editCustomCategory').value = '';
    }
}

// Handle budget custom category visibility
function handleBudgetCategoryChange() {
    const categorySelect = document.getElementById('budgetCategory');
    const customCategoryGroup = document.getElementById('budgetCustomCategoryGroup');
    if (categorySelect.value === '기타') {
        customCategoryGroup.style.display = 'block';
        document.getElementById('budgetCustomCategory').required = true;
    } else {
        customCategoryGroup.style.display = 'none';
        document.getElementById('budgetCustomCategory').required = false;
        document.getElementById('budgetCustomCategory').value = '';
    }
}

// Get final category value (handles custom category logic)
function getFinalCategory() {
    const categorySelect = document.getElementById('category');
    if (categorySelect.value === '기타') {
        return document.getElementById('customCategory').value.trim();
    }
    return categorySelect.value;
}

// Get final category value for edit modal
function getFinalEditCategory() {
    const categorySelect = document.getElementById('edit-category');
    if (categorySelect.value === '기타') {
        return document.getElementById('editCustomCategory').value.trim();
    }
    return categorySelect.value;
}

// Navigation setup
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'monthly') {
                showMonthlyExpenses();
            }
            if (targetId === 'viz') {
                document.getElementById('vizMonth').value = getMonthKey(getLocalDate());
                plotChart();
            }
            if (targetId === 'compare') {
                const now = new Date();
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                document.getElementById('compareMonth1').value = getMonthKey(getLocalDate());
                document.getElementById('compareMonth2').value = getMonthKey(prev.toISOString().substring(0, 10));
                compareExpenses();
            }
            if (targetId === 'view') {
                refreshTable();
            }
            if (targetId === 'budgets') {
                renderBudgetList();
            }
        });
    });

    // Form submissions and filters
    document.getElementById('addForm').addEventListener('submit', addExpense);
    document.getElementById('fromDate').addEventListener('change', refreshTable);
    document.getElementById('toDate').addEventListener('change', refreshTable);
    document.getElementById('filterCategory').addEventListener('change', refreshTable);
    document.getElementById('descSearch').addEventListener('input', refreshTable);

    // Category change handlers
    document.getElementById('category').addEventListener('change', handleCategoryChange);
    document.getElementById('edit-category').addEventListener('change', handleEditCategoryChange);

    // Monthly navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        const currentDisplay = document.getElementById('currentMonthDisplay').textContent;
        const [year, month] = currentDisplay.split('-');
        const newDate = new Date(parseInt(year), parseInt(month) - 2, 1);
        const newMonthKey = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        showMonthlyExpenses(newMonthKey);
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        const currentDisplay = document.getElementById('currentMonthDisplay').textContent;
        const [year, month] = currentDisplay.split('-');
        const newDate = new Date(parseInt(year), parseInt(month), 1);
        const newMonthKey = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
        showMonthlyExpenses(newMonthKey);
    });

    // Chart controls
    document.getElementById('vizMonth').addEventListener('change', plotChart);
    document.getElementById('vizType').addEventListener('change', plotChart);

    // Compare controls
    document.getElementById('compareMonth1').addEventListener('change', compareExpenses);
    document.getElementById('compareMonth2').addEventListener('change', compareExpenses);

    // Budget controls
    document.getElementById('addBudgetBtn').addEventListener('click', setBudget);

    // Budget controls
    document.getElementById('addBudgetBtn').addEventListener('click', setBudget);
    document.getElementById('budgetCategory').addEventListener('change', handleBudgetCategoryChange); // Add this line
}

// Utility functions
function getMonthKey(dateStr) {
    return dateStr.substring(0, 7);
}

function getLocalDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD'
    }).format(amount);
}

function showMessage(title, body) {
    document.getElementById('messageModalTitle').textContent = title;
    document.getElementById('messageModalBody').innerHTML = body;
    new bootstrap.Modal(document.getElementById('messageModal')).show();
}

// Dashboard rendering
async function renderDashboard() {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    try {
        // Get current month expenses
        const thisMonthQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', thisMonthKey)
        );
        const thisMonthSnapshot = await getDocs(thisMonthQuery);

        // Get last month expenses
        const lastMonthQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', lastMonthKey)
        );
        const lastMonthSnapshot = await getDocs(lastMonthQuery);

        let incomeThisMonth = 0;
        let expenseThisMonth = 0;
        let expenseLastMonth = 0;
        const expensesThisMonth = [];

        thisMonthSnapshot.forEach(doc => {
            const expense = doc.data();
            expensesThisMonth.push({ id: doc.id, ...expense });
            if (expense.type === 'income') {
                incomeThisMonth += expense.amount;
            } else {
                expenseThisMonth += expense.amount;
            }
        });

        lastMonthSnapshot.forEach(doc => {
            const expense = doc.data();
            if (expense.type === 'expense') {
                expenseLastMonth += expense.amount;
            }
        });

        // Update dashboard values
        const incomeEl = document.getElementById('dashboard-income');
        const expenseEl = document.getElementById('dashboard-expense');
        const prevExpenseEl = document.getElementById('dashboard-prev-expense');
        const netIncomeEl = document.getElementById('dashboard-net-income');

        if (incomeEl) incomeEl.textContent = formatCurrency(incomeThisMonth);
        if (expenseEl) expenseEl.textContent = formatCurrency(expenseThisMonth);
        if (prevExpenseEl) prevExpenseEl.textContent = formatCurrency(expenseLastMonth);
        if (netIncomeEl) netIncomeEl.textContent = formatCurrency(incomeThisMonth - expenseThisMonth);

        // Plot dashboard chart
        const chartElement = document.getElementById('dashboardChart');
        if (chartElement) {
            plotDashboardChart(expensesThisMonth);
        }

        checkBudgets();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
    }
}

function plotDashboardChart(data) {
    if (dashboardChart) {
        dashboardChart.destroy();
        dashboardChart = null;
    }

    const categorySums = {};
    data.forEach(exp => {
        if (exp.type === 'expense') {
            categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
        }
    });

    const labels = Object.keys(categorySums);
    const values = Object.values(categorySums);

    // If no data, show empty chart
    if (labels.length === 0) {
        labels.push('데이터 없음');
        values.push(0);
    }

    const ctx = document.getElementById('dashboardChart');
    if (!ctx) return;

    try {
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '지출',
                    data: values,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
}

// Data management functions
// Data management functions
// Data management functions
async function addExpense(e) {
    e.preventDefault();
    const finalCategory = getFinalCategory();
    if (!finalCategory) {
        showMessage('Error', 'Please enter a category.');
        return;
    }
    const newExpense = {
        userId: currentUser.uid,
        type: document.getElementById('type').value,
        date: document.getElementById('date').value || getLocalDate(),
        description: document.getElementById('description').value,
        category: finalCategory,
        amount: parseFloat(document.getElementById('amount').value),
        card: document.getElementById('card').value,
        month: getMonthKey(document.getElementById('date').value || getLocalDate()),
        timestamp: new Date().toISOString()
    };
    try {
        await addDoc(collection(db, 'expenses'), newExpense);
        document.getElementById('addForm').reset();
        document.getElementById('date').value = getLocalDate();
        document.getElementById('customCategoryGroup').style.display = 'none';
        renderDashboard();
        refreshTable();
        showMonthlyExpenses();
        showMessage('Success', 'Item successfully added.');
    } catch (error) {
        console.error('Error adding expense:', error);
        showMessage('Error', 'Failed to add item.');
    }
}
async function getFilteredExpenses() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const filterCategory = document.getElementById('filterCategory').value;
    const descSearch = document.getElementById('descSearch').value.toLowerCase();

    try {
        let q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        let allExpenses = [];

        querySnapshot.forEach(doc => {
            allExpenses.push({ id: doc.id, ...doc.data() });
        });

        return allExpenses.filter(exp => {
            const dateMatch = (!fromDate || exp.date >= fromDate) && (!toDate || exp.date <= toDate);
            const categoryMatch = (!filterCategory || exp.category === filterCategory);
            const descMatch = (!descSearch || exp.description.toLowerCase().includes(descSearch));
            return dateMatch && categoryMatch && descMatch;
        });
    } catch (error) {
        console.error('Error getting filtered expenses:', error);
        return [];
    }
}

async function refreshTable() {
    const tableBody = document.getElementById('expenseTable').querySelector('tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    const filteredExpenses = await getFilteredExpenses();
    let totalExpense = 0;
    let totalIncome = 0;

    filteredExpenses.forEach(exp => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.date}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.type === 'income' ? '수입' : '지출'}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.description}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.category}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(exp.amount)}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.card}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="openEditModal('${exp.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteExpense('${exp.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;

        if (exp.type === 'income') {
            totalIncome += exp.amount;
        } else {
            totalExpense += exp.amount;
        }
    });

    const totalEl = document.getElementById('filteredTotal');
    const incomeEl = document.getElementById('filteredIncomeTotal');
    if (totalEl) totalEl.textContent = formatCurrency(totalExpense);
    if (incomeEl) incomeEl.textContent = formatCurrency(totalIncome);
}

async function openEditModal(expenseId) {
    try {
        const docRef = doc(db, 'expenses', expenseId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            showMessage('오류', '항목을 찾을 수 없습니다.');
            return;
        }

        const expenseToEdit = docSnap.data();
        const editModal = new bootstrap.Modal(document.getElementById('editModal'));

        document.getElementById('edit-id').value = expenseId;
        document.getElementById('edit-type').value = expenseToEdit.type;
        document.getElementById('edit-date').value = expenseToEdit.date;
        document.getElementById('edit-description').value = expenseToEdit.description;

        // Handle category display in edit modal
        const predefinedCategories = ['그로서리', '외식', '주유+주차', '고정비용'];
        const categorySelect = document.getElementById('edit-category');

        if (predefinedCategories.includes(expenseToEdit.category)) {
            categorySelect.value = expenseToEdit.category;
            document.getElementById('editCustomCategoryGroup').style.display = 'none';
        } else {
            categorySelect.value = '기타';
            document.getElementById('editCustomCategoryGroup').style.display = 'block';
            document.getElementById('editCustomCategory').value = expenseToEdit.category;
        }

        document.getElementById('edit-amount').value = expenseToEdit.amount;
        document.getElementById('edit-card').value = expenseToEdit.card;

        editModal.show();
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showMessage('오류', '항목 편집을 열 수 없습니다.');
    }
}

async function saveEdit() {
    const expenseId = document.getElementById('edit-id').value;
    const finalCategory = getFinalEditCategory();

    if (!finalCategory) {
        showMessage('오류', '카테고리를 입력해주세요.');
        return;
    }

    const updatedExpense = {
        type: document.getElementById('edit-type').value,
        date: document.getElementById('edit-date').value,
        description: document.getElementById('edit-description').value,
        category: finalCategory,
        amount: parseInt(document.getElementById('edit-amount').value),
        card: document.getElementById('edit-card').value,
        month: getMonthKey(document.getElementById('edit-date').value)
    };

    try {
        await updateDoc(doc(db, 'expenses', expenseId), updatedExpense);

        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        renderDashboard();
        refreshTable();
        populateFilterCategories();
        showMessage('성공', '항목이 성공적으로 수정되었습니다.');
    } catch (error) {
        console.error('Error updating expense:', error);
        showMessage('오류', '항목 수정에 실패했습니다.');
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;

    try {
        await deleteDoc(doc(db, 'expenses', expenseId));

        renderDashboard();
        refreshTable();
        populateFilterCategories();
        showMessage('성공', '항목이 성공적으로 삭제되었습니다.');
    } catch (error) {
        console.error('Error deleting expense:', error);
        showMessage('오류', '항목 삭제에 실패했습니다.');
    }
}

async function populateFilterCategories() {
    const select = document.getElementById('filterCategory');
    if (!select) return;

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('type', '==', 'expense')
        );
        const querySnapshot = await getDocs(q);

        const categories = new Set();
        querySnapshot.forEach(doc => {
            categories.add(doc.data().category);
        });

        select.innerHTML = '<option value="">전체</option>';
        Array.from(categories).sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating categories:', error);
    }
}

async function showMonthlyExpenses(monthKey = getMonthKey(getLocalDate())) {
    const tableBody = document.getElementById('monthlyTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    document.getElementById('currentMonthDisplay').textContent = monthKey;

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', monthKey),
            orderBy('date', 'asc')
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(doc => {
            const exp = doc.data();
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.date}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.type === 'income' ? '수입' : '지출'}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.description}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.category}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(exp.amount)}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.card}</td>
            `;
        });
    } catch (error) {
        console.error('Error showing monthly expenses:', error);
    }
}

async function plotChart() {
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }

    const month = document.getElementById('vizMonth').value || getMonthKey(getLocalDate());
    const type = document.getElementById('vizType').value;

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month),
            where('type', '==', 'expense')
        );
        const querySnapshot = await getDocs(q);

        const categorySums = {};
        querySnapshot.forEach(doc => {
            const exp = doc.data();
            categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
        });

        const labels = Object.keys(categorySums);
        const values = Object.values(categorySums);

        if (labels.length === 0) {
            labels.push('데이터 없음');
            values.push(0);
        }

        const ctx = document.getElementById('vizChart');
        if (!ctx) return;

        const config = {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: '지출',
                    data: values,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const actualValue = type === 'pie' ? value : value.y || value;
                                return `${label}: ${formatCurrency(actualValue)}`;
                            }
                        }
                    }
                },
                scales: type === 'pie' ? {} : { y: { beginAtZero: true } }
            }
        };

        mainChart = new Chart(ctx, config);
    } catch (error) {
        console.error('Chart error:', error);
    }
}

async function compareExpenses() {
    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;
    const resultsDiv = document.getElementById('compareResults');
    if (!resultsDiv) return;

    resultsDiv.innerHTML = '';

    if (!month1 || !month2) {
        resultsDiv.innerHTML = '<p class="text-muted">비교할 두 달을 선택하세요.</p>';
        return;
    }

    try {
        // Get expenses for first month
        const q1 = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month1),
            where('type', '==', 'expense')
        );
        const snapshot1 = await getDocs(q1);

        // Get expenses for second month
        const q2 = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month2),
            where('type', '==', 'expense')
        );
        const snapshot2 = await getDocs(q2);

        const categorySums1 = {};
        snapshot1.forEach(doc => {
            const exp = doc.data();
            categorySums1[exp.category] = (categorySums1[exp.category] || 0) + exp.amount;
        });

        const categorySums2 = {};
        snapshot2.forEach(doc => {
            const exp = doc.data();
            categorySums2[exp.category] = (categorySums2[exp.category] || 0) + exp.amount;
        });

        const allCategories = [...new Set([...Object.keys(categorySums1), ...Object.keys(categorySums2)])];
        allCategories.forEach(category => {
            const sum1 = categorySums1[category] || 0;
            const sum2 = categorySums2[category] || 0;
            const difference = sum2 - sum1;
            const diffClass = difference > 0 ? 'text-danger' : 'text-success';
            const diffSign = difference > 0 ? '+' : '';
            resultsDiv.innerHTML += `
                <p><strong>${category}:</strong> 
                ${formatCurrency(sum1)} vs ${formatCurrency(sum2)} 
                (<span class="${diffClass}">${diffSign}${formatCurrency(difference)}</span>)
                </p>`;
        });
    } catch (error) {
        console.error('Error comparing expenses:', error);
        resultsDiv.innerHTML = '<p class="text-danger">비교 데이터를 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function exportMonth() {
    const month = document.getElementById('exportMonth').value;

    if (!month) {
        showMessage('알림', '내보낼 월을 선택하세요.');
        return;
    }

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month),
            orderBy('date', 'asc')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showMessage('알림', '선택한 월에 내보낼 데이터가 없습니다.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "날짜,구분,내용,카테고리,금액,결제수단\n";

        querySnapshot.forEach(doc => {
            const exp = doc.data();
            const row = [
                exp.date,
                exp.type === 'income' ? '수입' : '지출',
                exp.description,
                exp.category,
                exp.amount,
                exp.card
            ].map(e => `"${e}"`).join(',');
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `가계부_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage('오류', '데이터 내보내기에 실패했습니다.');
    }
}

async function setBudget() {
    let category = document.getElementById('budgetCategory').value;
    const amount = parseFloat(document.getElementById('budgetAmount').value);

    // Handle custom category
    if (category === '기타') {
        const customCategory = document.getElementById('budgetCustomCategory').value.trim();
        if (!customCategory) {
            showMessage('Error', 'Please enter a custom category.');
            return;
        }
        category = customCategory;
    }

    if (!category || isNaN(amount) || amount <= 0) {
        showMessage('Error', 'Please enter a valid category and amount.');
        return;
    }

    try {
        const budgetDoc = {
            userId: currentUser.uid,
            category: category,
            amount: amount,
            updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'budgets', `${currentUser.uid}_${category}`), budgetDoc);

        document.getElementById('budgetCategory').value = '';
        document.getElementById('budgetAmount').value = '';

        renderBudgetList();
        checkBudgets();
        showMessage('성공', '예산이 성공적으로 설정되었습니다.');
    } catch (error) {
        console.error('Error setting budget:', error);
        showMessage('오류', '예산 설정에 실패했습니다.');
    }
}

async function deleteBudget(category) {
    if (!confirm(`'${category}' 예산을 삭제하시겠습니까?`)) return;

    try {
        await deleteDoc(doc(db, 'budgets', `${currentUser.uid}_${category}`));

        renderBudgetList();
        checkBudgets();
        showMessage('성공', '예산이 성공적으로 삭제되었습니다.');
    } catch (error) {
        console.error('Error deleting budget:', error);
        showMessage('오류', '예산 삭제에 실패했습니다.');
    }
}

async function renderBudgetList() {
    const listDiv = document.getElementById('budget-list');
    if (!listDiv) return;

    listDiv.innerHTML = '';

    try {
        const q = query(
            collection(db, 'budgets'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            listDiv.innerHTML = '<p class="text-muted">설정된 예산이 없습니다.</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const budget = doc.data();
            const budgetItem = document.createElement('div');
            budgetItem.className = 'd-flex justify-content-between align-items-center bg-light p-2 rounded mb-2';
            budgetItem.innerHTML = `
                <span><strong>${budget.category}</strong>: ${formatCurrency(budget.amount)}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteBudget('${budget.category}')">삭제</button>
            `;
            listDiv.appendChild(budgetItem);
        });
    } catch (error) {
        console.error('Error rendering budget list:', error);
        listDiv.innerHTML = '<p class="text-danger">예산 목록을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

async function checkBudgets() {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const alertsDiv = document.getElementById('budget-alerts');
    if (!alertsDiv) return;

    alertsDiv.innerHTML = '';

    try {
        // Get current month expenses by category
        const expenseQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', thisMonthKey),
            where('type', '==', 'expense')
        );
        const expenseSnapshot = await getDocs(expenseQuery);

        const categorySums = {};
        expenseSnapshot.forEach(doc => {
            const exp = doc.data();
            categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
        });

        // Get budgets
        const budgetQuery = query(
            collection(db, 'budgets'),
            where('userId', '==', currentUser.uid)
        );
        const budgetSnapshot = await getDocs(budgetQuery);

        let hasAlerts = false;
        budgetSnapshot.forEach(doc => {
            const budget = doc.data();
            const totalSpent = categorySums[budget.category] || 0;

            if (totalSpent > budget.amount) {
                const alertItem = document.createElement('div');
                alertItem.className = 'alert alert-warning p-2 mb-2 d-flex align-items-center';
                alertItem.innerHTML = `
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <div>
                        <p class="mb-0"><strong>${budget.category}</strong> 예산을 초과했습니다!</p>
                        <small class="text-muted">지출: ${formatCurrency(totalSpent)} / 예산: ${formatCurrency(budget.amount)}</small>
                    </div>
                `;
                alertsDiv.appendChild(alertItem);
                hasAlerts = true;
            }
        });

        if (!hasAlerts) {
            alertsDiv.innerHTML = '<p class="text-muted">예산 초과 내역이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Error checking budgets:', error);
        alertsDiv.innerHTML = '<p class="text-danger">예산 확인 중 오류가 발생했습니다.</p>';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set up authentication
    document.getElementById('loginForm').addEventListener('submit', handleEmailLogin);
    document.getElementById('signupForm').addEventListener('submit', handleEmailSignup);

    // Toggle between login and signup forms
    document.getElementById('signupLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });

    document.getElementById('loginLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    });

    document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
        e.preventDefault();
        handlePasswordReset();
    });

    // Google Sign-In button
    document.getElementById('googleSignInBtn').addEventListener('click', function(e) {
        e.preventDefault();
        handleGoogleSignIn();
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Set current date
    const dateInput = document.getElementById('date');
    const vizMonthInput = document.getElementById('vizMonth');
    const exportMonthInput = document.getElementById('exportMonth');

    if (dateInput) dateInput.value = getLocalDate();
    if (vizMonthInput) vizMonthInput.value = getMonthKey(getLocalDate());
    if (exportMonthInput) exportMonthInput.value = getMonthKey(getLocalDate());

    // Setup navigation
    setupNavigation();

    // Show loading spinner initially
    loadingSpinner.style.display = 'flex';
});

// Global function exports for onclick handlers
window.handleGoogleSignIn = handleGoogleSignIn;
window.openEditModal = openEditModal;
window.saveEdit = saveEdit;
window.deleteExpense = deleteExpense;
window.exportMonth = exportMonth;
window.deleteBudget = deleteBudget;