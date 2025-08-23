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
let vizChart = null;
let compareChart = null;

// UI elements
const loadingSpinner = document.getElementById('loading-spinner');
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const monthlySelectInput = document.getElementById('monthly-select');

// Authentication functions
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    try {
        loadingSpinner.style.display = 'flex';
        await signInWithEmailAndPassword(auth, email, password);
        showMessageModal('로그인 성공', '환영합니다!');
    } catch (error) {
        showMessageModal('로그인 실패', '이메일 또는 비밀번호가 올바르지 않습니다.');
        console.error("Login failed:", error.code, error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (password !== confirmPassword) {
        showMessageModal('회원가입 실패', '비밀번호가 일치하지 않습니다.');
        return;
    }
    try {
        loadingSpinner.style.display = 'flex';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            createdAt: new Date()
        });
        showMessageModal('회원가입 성공', '성공적으로 가입되었습니다. 로그인해 주세요.');
        document.getElementById('signup-form').style.display = 'none';
        document.querySelector('.login-card').style.display = 'block';
    } catch (error) {
        showMessageModal('회원가입 실패', '회원가입 중 오류가 발생했습니다: ' + error.message);
        console.error("Signup failed:", error.code, error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function handleGoogleSignIn() {
    try {
        loadingSpinner.style.display = 'flex';
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            await setDoc(userDocRef, {
                email: user.email,
                createdAt: new Date(),
            });
        }
    } catch (error) {
        showMessageModal('로그인 실패', 'Google 로그인 중 오류가 발생했습니다: ' + error.message);
        console.error("Google sign-in failed:", error.code, error.message);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        showMessageModal('로그아웃', '성공적으로 로그아웃되었습니다.');
    } catch (error) {
        showMessageModal('로그아웃 실패', '로그아웃 중 오류가 발생했습니다.');
        console.error("Logout failed:", error.message);
    }
}

async function handlePasswordReset() {
    const email = prompt("비밀번호를 재설정할 이메일 주소를 입력하세요:");
    if (email) {
        try {
            await sendPasswordResetEmail(auth, email);
            showMessageModal('비밀번호 재설정 이메일 전송', '비밀번호 재설정 링크가 이메일로 전송되었습니다.');
        } catch (error) {
            showMessageModal('오류', '이메일 전송 중 오류가 발생했습니다: ' + error.message);
            console.error("Password reset failed:", error.message);
        }
    }
}

function showMessageModal(title, body) {
    document.getElementById('messageModalTitle').textContent = title;
    document.getElementById('messageModalBody').textContent = body;
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
    messageModal.show();
}

// Data handling functions
async function addExpense(e) {
    e.preventDefault();
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const card = document.getElementById('card').value;
    if (!currentUser) return;
    try {
        await addDoc(collection(db, `users/${currentUser.uid}/expenses`), {
            type,
            date,
            description,
            category,
            amount,
            card,
            timestamp: new Date()
        });
        showMessageModal('성공', '항목이 성공적으로 추가되었습니다.');
        document.getElementById('addForm').reset();
    } catch (error) {
        showMessageModal('오류', '항목 추가 중 오류가 발생했습니다: ' + error.message);
        console.error("Error adding document: ", error);
    }
}

async function fetchExpenses(userId, dateRange = null) {
    const expensesRef = collection(db, `users/${userId}/expenses`);
    let q = query(expensesRef, orderBy("date", "desc"));
    if (dateRange) {
        q = query(expensesRef, where("date", ">=", dateRange.start), where("date", "<=", dateRange.end), orderBy("date", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadDashboardData() {
    if (!currentUser) return;
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const expenses = await fetchExpenses(currentUser.uid, { start: currentMonthStart, end: currentMonthEnd });

    let income = 0;
    let expense = 0;
    const categoryTotals = {};

    expenses.forEach(item => {
        if (item.type === 'income') {
            income += item.amount;
        } else {
            expense += item.amount;
            if (categoryTotals[item.category]) {
                categoryTotals[item.category] += item.amount;
            } else {
                categoryTotals[item.category] = item.amount;
            }
        }
    });

    document.getElementById('dashboard-income').textContent = `$${income.toFixed(2)}`;
    document.getElementById('dashboard-expense').textContent = `$${expense.toFixed(2)}`;
    document.getElementById('dashboard-net-income').textContent = `$${(income - expense).toFixed(2)}`;

    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1).toISOString().slice(0, 10);
    const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).toISOString().slice(0, 10);
    const prevExpenses = await fetchExpenses(currentUser.uid, { start: prevMonthStart, end: prevMonthEnd });
    const prevTotalExpense = prevExpenses.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    document.getElementById('dashboard-prev-expense').textContent = `$${prevTotalExpense.toFixed(2)}`;

    updateDashboardChart(categoryTotals);
}

function updateDashboardChart(categoryTotals) {
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    const categories = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (data.length === 0) {
        document.getElementById('no-dashboard-data').style.display = 'block';
        return;
    }
    document.getElementById('no-dashboard-data').style.display = 'none';

    dashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                hoverBackgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            contentSections.forEach(section => section.style.display = 'none');
            const targetId = link.dataset.target;
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            if (targetId === 'dashboard') {
                loadDashboardData();
            } else if (targetId === 'monthly') {
                loadMonthlyData();
            } else if (targetId === 'view') {
                loadAllExpenses();
            } else if (targetId === 'viz') {
                document.getElementById('vizMonth').value = new Date().toISOString().slice(0, 7);
                loadVizChart();
            } else if (targetId === 'compare') {
                loadCompareChart();
            }
        });
    });
}

async function loadMonthlyData(month = null) {
    if (!currentUser) return;
    const date = month ? new Date(month) : new Date();
    const year = date.getFullYear();
    const currentMonth = date.getMonth();

    const monthlyStart = new Date(year, currentMonth, 1).toISOString().slice(0, 10);
    const monthlyEnd = new Date(year, currentMonth + 1, 0).toISOString().slice(0, 10);

    document.getElementById('currentMonthDisplay').textContent = `${year}년 ${currentMonth + 1}월`;
    monthlySelectInput.value = `${year}-${(currentMonth + 1).toString().padStart(2, '0')}`;

    const monthlyExpenses = await fetchExpenses(currentUser.uid, { start: monthlyStart, end: monthlyEnd });

    let income = 0;
    let expense = 0;
    const categoryDetails = {};

    const tableBody = document.getElementById('monthlyTableBody');
    tableBody.innerHTML = '';

    if (monthlyExpenses.length === 0) {
        // Handle no data case
    } else {
        monthlyExpenses.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.date}</td>
                <td><span class="badge bg-${item.type === 'income' ? 'success' : 'danger'}">${item.type === 'income' ? '수입' : '지출'}</span></td>
                <td>${item.description}</td>
                <td>${item.category}</td>
                <td>$${item.amount.toFixed(2)}</td>
                <td>${item.card}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${item.id}', '${item.type}', '${item.date}', '${item.description}', '${item.category}', '${item.amount}', '${item.card}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${item.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);

            if (item.type === 'income') {
                income += item.amount;
            } else {
                expense += item.amount;
                if (!categoryDetails[item.category]) {
                    categoryDetails[item.category] = { count: 0, total: 0 };
                }
                categoryDetails[item.category].count++;
                categoryDetails[item.category].total += item.amount;
            }
        });
    }

    document.getElementById('monthlyIncome').textContent = `$${income.toFixed(2)}`;
    document.getElementById('monthlyExpense').textContent = `$${expense.toFixed(2)}`;
    document.getElementById('monthlyNet').textContent = `$${(income - expense).toFixed(2)}`;

    const categoryList = document.getElementById('categoryDetailsList');
    categoryList.innerHTML = '';
    for (const cat in categoryDetails) {
        const li = document.createElement('li');
        li.textContent = `${cat}: $${categoryDetails[cat].total.toFixed(2)} (${categoryDetails[cat].count}건)`;
        categoryList.appendChild(li);
    }
}

async function loadAllExpenses() {
    if (!currentUser) return;
    const expenses = await fetchExpenses(currentUser.uid);
    let income = 0;
    let totalExpense = 0;
    const tableBody = document.getElementById('expenseTableBody');
    tableBody.innerHTML = '';

    expenses.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td><span class="badge bg-${item.type === 'income' ? 'success' : 'danger'}">${item.type === 'income' ? '수입' : '지출'}</span></td>
            <td>${item.description}</td>
            <td>${item.category}</td>
            <td>$${item.amount.toFixed(2)}</td>
            <td>${item.card}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="openEditModal('${item.id}', '${item.type}', '${item.date}', '${item.description}', '${item.category}', '${item.amount}', '${item.card}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteExpense('${item.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);

        if (item.type === 'income') {
            income += item.amount;
        } else {
            totalExpense += item.amount;
        }
    });

    document.getElementById('filteredIncomeTotal').textContent = `$${income.toFixed(2)}`;
    document.getElementById('filteredTotal').textContent = `$${totalExpense.toFixed(2)}`;
}

async function loadVizChart() {
    if (!currentUser) return;
    if (vizChart) vizChart.destroy();
    const vizMonth = document.getElementById('vizMonth').value;
    if (!vizMonth) return;

    const date = new Date(vizMonth);
    const monthlyStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
    const monthlyEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
    const expenses = await fetchExpenses(currentUser.uid, { start: monthlyStart, end: monthlyEnd });

    const categoryTotals = {};
    expenses.filter(item => item.type === 'expense').forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    });

    const ctx = document.getElementById('vizChart').getContext('2d');
    const chartType = document.getElementById('vizType').value;

    if (Object.keys(categoryTotals).length === 0) {
        document.getElementById('no-viz-data').style.display = 'block';
        return;
    }
    document.getElementById('no-viz-data').style.display = 'none';

    vizChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: Object.keys(categoryTotals),
            datasets: [{
                label: '지출 금액',
                data: Object.values(categoryTotals),
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

async function loadCompareChart() {
    if (!currentUser) return;
    if (compareChart) compareChart.destroy();
    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;
    if (!month1 || !month2) {
        document.getElementById('no-compare-data').style.display = 'block';
        return;
    }

    const expenses1 = await fetchExpenses(currentUser.uid, { start: new Date(month1).toISOString().slice(0, 10), end: new Date(new Date(month1).getFullYear(), new Date(month1).getMonth() + 1, 0).toISOString().slice(0, 10) });
    const expenses2 = await fetchExpenses(currentUser.uid, { start: new Date(month2).toISOString().slice(0, 10), end: new Date(new Date(month2).getFullYear(), new Date(month2).getMonth() + 1, 0).toISOString().slice(0, 10) });

    const totalExpense1 = expenses1.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const totalExpense2 = expenses2.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const totalIncome1 = expenses1.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const totalIncome2 = expenses2.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);

    const ctx = document.getElementById('compareChart').getContext('2d');
    compareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['총 수입', '총 지출'],
            datasets: [{
                label: `${month1} 금액`,
                data: [totalIncome1, totalExpense1],
                backgroundColor: '#3b82f6',
            }, {
                label: `${month2} 금액`,
                data: [totalIncome2, totalExpense2],
                backgroundColor: '#ef4444',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    document.getElementById('no-compare-data').style.display = 'none';
}

function openEditModal(id, type, date, description, category, amount, card) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-type').value = type;
    document.getElementById('edit-date').value = date;
    document.getElementById('edit-description').value = description;
    document.getElementById('edit-category').value = category;
    document.getElementById('edit-amount').value = amount;
    document.getElementById('edit-card').value = card;
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
}

async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('edit-type').value;
    const date = document.getElementById('edit-date').value;
    const description = document.getElementById('edit-description').value;
    const category = document.getElementById('edit-category').value;
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const card = document.getElementById('edit-card').value;
    if (!currentUser) return;
    try {
        const expenseDocRef = doc(db, `users/${currentUser.uid}/expenses`, id);
        await updateDoc(expenseDocRef, { type, date, description, category, amount, card });
        showMessageModal('성공', '항목이 성공적으로 업데이트되었습니다.');
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        loadAllExpenses(); // Reload data after update
    } catch (error) {
        showMessageModal('오류', '항목 업데이트 중 오류가 발생했습니다: ' + error.message);
        console.error("Error updating document:", error);
    }
}

async function deleteExpense(id) {
    if (!currentUser) return;
    if (!confirm("정말로 이 항목을 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/expenses`, id));
        showMessageModal('성공', '항목이 성공적으로 삭제되었습니다.');
        loadAllExpenses(); // Reload data after deletion
    } catch (error) {
        showMessageModal('오류', '항목 삭제 중 오류가 발생했습니다: ' + error.message);
        console.error("Error deleting document:", error);
    }
}

async function exportToCsv() {
    if (!currentUser) {
        showMessageModal('오류', '로그인 후 이용해 주세요.');
        return;
    }
    const expenses = await fetchExpenses(currentUser.uid);
    if (expenses.length === 0) {
        showMessageModal('알림', '내보낼 데이터가 없습니다.');
        return;
    }

    const headers = ['날짜', '유형', '내용', '카테고리', '금액', '결제 수단'];
    const rows = expenses.map(item => [
        item.date,
        item.type === 'income' ? '수입' : '지출',
        item.description,
        item.category,
        item.amount,
        item.card
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + '\n' +
        rows.map(row => row.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', '가계부_내역.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessageModal('성공', '데이터가 CSV 파일로 성공적으로 내보내졌습니다.');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Show loading spinner
    loadingSpinner.style.display = 'flex';

    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            loginPage.style.display = 'none';
            appContainer.style.display = 'flex';
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-id').textContent = user.uid.substring(0, 8);
            loadDashboardData();
            loadAllExpenses();
        } else {
            currentUser = null;
            loginPage.style.display = 'flex';
            appContainer.style.display = 'none';
        }
        loadingSpinner.style.display = 'none';
    });

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleEmailLogin);
    document.getElementById('signupForm').addEventListener('submit', handleEmailSignup);
    document.getElementById('addForm').addEventListener('submit', addExpense);
    document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);

    // Logout and Password Reset
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        handlePasswordReset();
    });

    // Edit and Delete
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);

    // Navigation
    setupNavigation();
    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        const currentMonth = new Date(monthlySelectInput.value);
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        monthlySelectInput.value = currentMonth.toISOString().slice(0, 7);
        loadMonthlyData(monthlySelectInput.value);
    });
    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        const currentMonth = new Date(monthlySelectInput.value);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        monthlySelectInput.value = currentMonth.toISOString().slice(0, 7);
        loadMonthlyData(monthlySelectInput.value);
    });
    monthlySelectInput.addEventListener('change', () => loadMonthlyData(monthlySelectInput.value));

    // Page-specific initial loads
    document.getElementById('date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('monthly-select').value = new Date().toISOString().slice(0, 7);
    document.getElementById('vizMonth').value = new Date().toISOString().slice(0, 7);
    document.getElementById('vizType').addEventListener('change', loadVizChart);
    document.getElementById('vizMonth').addEventListener('change', loadVizChart);
    document.getElementById('compareMonth1').value = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
    document.getElementById('compareMonth2').value = new Date().toISOString().slice(0, 7);
    document.getElementById('compareMonth1').addEventListener('change', loadCompareChart);
    document.getElementById('compareMonth2').addEventListener('change', loadCompareChart);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);

    // Login/Signup form toggles
    document.getElementById('signupLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });
    document.getElementById('loginLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').style.display = 'none';
        document.querySelector('.login-card').style.display = 'block';
    });

    // Dark Mode Toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        const icon = document.getElementById('theme-toggle').querySelector('i');
        icon.classList.toggle('fa-sun', isDarkMode);
        icon.classList.toggle('fa-moon', !isDarkMode);
    });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-toggle').querySelector('i');
        if (icon) {
            icon.classList.add('fa-sun');
            icon.classList.remove('fa-moon');
        }
    }
    window.openEditModal = openEditModal;
    window.deleteExpense = deleteExpense;
}
);