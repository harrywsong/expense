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
let compareChart = null;

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
    } catch (error) {
        console.error('Error initializing user data:', error);
    }
}

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
        if (compareChart) {
            compareChart.destroy();
            compareChart = null;
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

// Fixed comparison chart function
async function loadComparisonChart() {
    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;

    if (!month1 || !month2) {
        document.getElementById('no-compare-data').style.display = 'block';
        if (compareChart) {
            compareChart.destroy();
            compareChart = null;
        }
        return;
    }

    try {
        // Query all expenses for the user
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const allTransactions = [];

        querySnapshot.forEach(doc => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });

        // Filter transactions by month for expenses only
        const expenses1 = allTransactions.filter(t =>
            t.type === 'expense' &&
            t.month === month1 // Use the month field stored in the document
        );

        const expenses2 = allTransactions.filter(t =>
            t.type === 'expense' &&
            t.month === month2 // Use the month field stored in the document
        );

        // Group by category
        const categories1 = expenses1.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

        const categories2 = expenses2.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

        const allCategories = [...new Set([...Object.keys(categories1), ...Object.keys(categories2)])];

        if (allCategories.length === 0) {
            document.getElementById('no-compare-data').style.display = 'block';
            if (compareChart) {
                compareChart.destroy();
                compareChart = null;
            }
            return;
        }

        document.getElementById('no-compare-data').style.display = 'none';

        const data1 = allCategories.map(cat => categories1[cat] || 0);
        const data2 = allCategories.map(cat => categories2[cat] || 0);

        const ctx = document.getElementById('compareChart').getContext('2d');
        if (compareChart) {
            compareChart.destroy();
        }

        compareChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allCategories,
                datasets: [{
                    label: `${month1} 지출`,
                    data: data1,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }, {
                    label: `${month2} 지출`,
                    data: data2,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '금액 ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error loading comparison chart:', error);
        document.getElementById('no-compare-data').style.display = 'block';
        if (compareChart) {
            compareChart.destroy();
            compareChart = null;
        }
    }
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
                const monthlySelectInput = document.getElementById('monthly-select');
                if (monthlySelectInput) {
                    monthlySelectInput.value = new Date().toISOString().slice(0, 7);
                    loadMonthlyData();
                }
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
                loadComparisonChart();
            }
            if (targetId === 'view') {
                refreshTable();
            }
        });
    });

    // Form submissions and filters
    if (document.getElementById('addForm')) document.getElementById('addForm').addEventListener('submit', addExpense);
    if (document.getElementById('fromDate')) document.getElementById('fromDate').addEventListener('change', refreshTable);
    if (document.getElementById('toDate')) document.getElementById('toDate').addEventListener('change', refreshTable);
    if (document.getElementById('filterCategory')) document.getElementById('filterCategory').addEventListener('change', refreshTable);
    if (document.getElementById('descSearch')) document.getElementById('descSearch').addEventListener('input', refreshTable);

    // Enhanced filter listeners
    if (document.getElementById('filterCard')) document.getElementById('filterCard').addEventListener('change', refreshTable);
    if (document.getElementById('minAmount')) document.getElementById('minAmount').addEventListener('input', refreshTable);
    if (document.getElementById('maxAmount')) document.getElementById('maxAmount').addEventListener('input', refreshTable);

    // Category change handlers
    if (document.getElementById('category')) document.getElementById('category').addEventListener('change', handleCategoryChange);
    if (document.getElementById('edit-category')) document.getElementById('edit-category').addEventListener('change', handleEditCategoryChange);

    // Fixed monthly navigation with proper month picker handling
    if (document.getElementById('monthly-select')) {
        document.getElementById('monthly-select').addEventListener('change', loadMonthlyData);
    }

    if (document.getElementById('prevMonthBtn')) {
        document.getElementById('prevMonthBtn').addEventListener('click', () => {
            const monthlySelectInput = document.getElementById('monthly-select');
            if (monthlySelectInput) {
                const [year, month] = monthlySelectInput.value.split('-').map(Number);
                const newDate = new Date(year, month - 2); // Go back one month
                const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
                monthlySelectInput.value = newMonth;
                loadMonthlyData();
            }
        });
    }

    if (document.getElementById('nextMonthBtn')) {
        document.getElementById('nextMonthBtn').addEventListener('click', () => {
            const monthlySelectInput = document.getElementById('monthly-select');
            if (monthlySelectInput) {
                const [year, month] = monthlySelectInput.value.split('-').map(Number);
                const newDate = new Date(year, month); // Go forward one month
                const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
                monthlySelectInput.value = newMonth;
                loadMonthlyData();
            }
        });
    }

    // Chart controls
    if (document.getElementById('vizMonth')) document.getElementById('vizMonth').addEventListener('change', plotChart);
    if (document.getElementById('vizType')) document.getElementById('vizType').addEventListener('change', plotChart);

    // Compare controls
    if (document.getElementById('compareMonth1')) document.getElementById('compareMonth1').addEventListener('change', loadComparisonChart);
    if (document.getElementById('compareMonth2')) document.getElementById('compareMonth2').addEventListener('change', loadComparisonChart);

    if (document.getElementById('exportCsvBtn')) document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
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
        if (document.getElementById('dashboardChart')) document.getElementById('dashboardChart').style.display = 'none';
        if (document.getElementById('no-dashboard-data')) document.getElementById('no-dashboard-data').style.display = 'block';
        return;
    } else {
        if (document.getElementById('dashboardChart')) document.getElementById('dashboardChart').style.display = 'block';
        if (document.getElementById('no-dashboard-data')) document.getElementById('no-dashboard-data').style.display = 'none';
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
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value, index, ticks) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Chart initialization error:', error);
    }
}

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
        loadMonthlyData();
        showMessage('성공', '항목이 성공적으로 추가되었습니다.');
    } catch (error) {
        console.error('Error adding expense:', error);
        showMessage('Error', 'Failed to add item.');
    }
}

// Enhanced filter function with additional filters
async function getFilteredExpenses() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const filterCategory = document.getElementById('filterCategory').value;
    const descSearch = document.getElementById('descSearch').value.toLowerCase();
    const filterCard = document.getElementById('filterCard')?.value || '';
    const minAmount = parseFloat(document.getElementById('minAmount')?.value || 0);
    const maxAmount = parseFloat(document.getElementById('maxAmount')?.value || Infinity);

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
            const cardMatch = (!filterCard || exp.card === filterCard);
            const amountMatch = exp.amount >= minAmount && exp.amount <= maxAmount;
            return dateMatch && categoryMatch && descMatch && cardMatch && amountMatch;
        });
    } catch (error) {
        console.error('Error getting filtered expenses:', error);
        return [];
    }
}

async function refreshTable() {
    const tableBody = document.getElementById('expenseTableBody');
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
        amount: parseFloat(document.getElementById('edit-amount').value),
        card: document.getElementById('edit-card').value,
        month: getMonthKey(document.getElementById('edit-date').value)
    };

    try {
        await updateDoc(doc(db, 'expenses', expenseId), updatedExpense);

        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        renderDashboard();
        refreshTable();
        populateFilterCategories();
        loadMonthlyData();
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
        loadMonthlyData();
        showMessage('성공', '항목이 성공적으로 삭제되었습니다.');
    } catch (error) {
        console.error('Error deleting expense:', error);
        showMessage('오류', '항목 삭제에 실패했습니다.');
    }
}

async function populateFilterCategories() {
    const select = document.getElementById('filterCategory');
    const cardSelect = document.getElementById('filterCard');

    if (!select) return;

    try {
        // Define the fixed categories you want to include
        const fixedCategories = new Set([
            '그로서리',
            '외식',
            '주유+주차',
            '고정비용'
        ]);

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(q);

        const cards = new Set();

        // Add categories and cards from Firestore to the sets
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'expense') {
                fixedCategories.add(data.category);
            }
            cards.add(data.card);
        });

        // Clear existing options
        select.innerHTML = '<option value="">전체</option>';

        // Convert the set to an array, sort it, and populate the category dropdown
        Array.from(fixedCategories).sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });

        // Populate card filter if it exists
        if (cardSelect) {
            cardSelect.innerHTML = '<option value="">전체 결제수단</option>';
            Array.from(cards).sort().forEach(card => {
                const option = document.createElement('option');
                option.value = card;
                option.textContent = card;
                cardSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error populating categories:', error);
    }
}

// Enhanced monthly data loading function
async function loadMonthlyData() {
    const selectedMonthInput = document.getElementById('monthly-select');
    if (!selectedMonthInput) return;

    const selectedMonth = selectedMonthInput.value;
    if (!selectedMonth) return;

    document.getElementById('currentMonthDisplay').textContent = selectedMonth;

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', selectedMonth),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const expenses = [];
        let totalIncome = 0;
        let totalExpense = 0;
        const cardStats = {}; // Changed from monthlyStats to cardStats for clarity
        const categoryDetails = {};

        querySnapshot.forEach(doc => {
            const expense = { id: doc.id, ...doc.data() };
            expenses.push(expense);

            if (expense.type === 'income') {
                totalIncome += expense.amount;
            } else {
                totalExpense += expense.amount;
            }

            // Aggregate card stats
            const card = expense.card || '현금';
            if (!cardStats[card]) {
                cardStats[card] = { income: 0, expense: 0, total: 0 };
            }

            if (expense.type === 'income') {
                cardStats[card].income += expense.amount;
            } else {
                cardStats[card].expense += expense.amount;
            }
            cardStats[card].total += expense.amount;

            // Aggregate category details for expenses only
            if (expense.type === 'expense') {
                const category = expense.category || '기타';
                categoryDetails[category] = (categoryDetails[category] || 0) + expense.amount;
            }
        });

        // Update table
        const tableBody = document.getElementById('monthlyTableBody');
        tableBody.innerHTML = '';
        expenses.forEach(exp => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${exp.date}</td>
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${exp.type === 'income' ? '수입' : '지출'}</td>
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${exp.description}</td>
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${exp.category}</td>
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${formatCurrency(exp.amount)}</td>
                <td class="${exp.type === 'income' ? 'text-success fw-bold' : 'text-danger'}">${exp.card}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="openEditModal('${exp.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExpense('${exp.id}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
        });

        // Update monthly summary boxes with better styling
        document.getElementById('monthlyIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('monthlyExpense').textContent = formatCurrency(totalExpense);

        const netAmount = totalIncome - totalExpense;
        const netElement = document.getElementById('monthlyNet');
        netElement.textContent = formatCurrency(netAmount);

        // Change card color based on net amount
        const netCard = netElement.closest('.card');
        netCard.className = 'card text-white ' + (netAmount >= 0 ? 'bg-success' : 'bg-danger');

        // Populate enhanced monthly stats list
        const monthlyStatsList = document.getElementById('monthlyStatsList');
        monthlyStatsList.innerHTML = '';
        if (Object.keys(cardStats).length === 0) {
            monthlyStatsList.innerHTML = '<li class="text-muted">이번 달 내역이 없습니다.</li>';
        } else {
            monthlyStatsList.innerHTML = '<h6 class="fw-bold mb-2">결제수단별 통계:</h6>';
            for (const [card, stats] of Object.entries(cardStats)) {
                const listItem = document.createElement('li');
                listItem.className = 'mb-2 p-2 bg-light rounded';
                listItem.innerHTML = `
                    <strong>${card}</strong><br>
                    <small class="text-success">수입: ${formatCurrency(stats.income)}</small><br>
                    <small class="text-danger">지출: ${formatCurrency(stats.expense)}</small><br>
                    <small class="text-primary">순액: ${formatCurrency(stats.income - stats.expense)}</small>
                `;
                monthlyStatsList.appendChild(listItem);
            }
        }

        // Populate enhanced category details list
        const categoryDetailsList = document.getElementById('categoryDetailsList');
        categoryDetailsList.innerHTML = '';
        if (Object.keys(categoryDetails).length === 0) {
            categoryDetailsList.innerHTML = '<li class="text-muted">이번 달 지출 내역이 없습니다.</li>';
        } else {
            categoryDetailsList.innerHTML = '<h6 class="fw-bold mb-2">카테고리별 지출:</h6>';

            // Sort categories by amount (descending)
            const sortedCategories = Object.entries(categoryDetails)
                .sort(([,a], [,b]) => b - a);

            sortedCategories.forEach(([category, amount]) => {
                const listItem = document.createElement('li');
                listItem.className = 'mb-2 p-2 bg-light rounded d-flex justify-content-between align-items-center';

                const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;

                listItem.innerHTML = `
                    <span><strong>${category}</strong></span>
                    <span>
                        <span class="text-danger fw-bold">${formatCurrency(amount)}</span>
                        <small class="text-muted"> (${percentage}%)</small>
                    </span>
                `;
                categoryDetailsList.appendChild(listItem);
            });

            // Add total verification
            const totalVerification = document.createElement('li');
            totalVerification.className = 'mt-3 pt-2 border-top fw-bold text-primary';
            totalVerification.innerHTML = `총 지출: ${formatCurrency(totalExpense)}`;
            categoryDetailsList.appendChild(totalVerification);
        }
    } catch (error) {
        console.error('Error loading monthly data:', error);
    }
}

async function plotChart() {
    const selectedMonth = document.getElementById('vizMonth').value;
    const chartType = document.getElementById('vizType').value;

    if (!selectedMonth) {
        document.getElementById('no-viz-data').style.display = 'block';
        if (mainChart) {
            mainChart.destroy();
        }
        return;
    }

    const q = query(
        collection(db, 'expenses'),
        where('userId', '==', currentUser.uid),
        where('month', '==', selectedMonth),
        where('type', '==', 'expense')
    );

    const querySnapshot = await getDocs(q);
    const categoryData = {};
    querySnapshot.forEach(doc => {
        const data = doc.data();
        categoryData[data.category] = (categoryData[data.category] || 0) + data.amount;
    });

    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);

    if (labels.length === 0) {
        document.getElementById('no-viz-data').style.display = 'block';
        if (mainChart) {
            mainChart.destroy();
        }
        return;
    }

    document.getElementById('no-viz-data').style.display = 'none';
    const ctx = document.getElementById('vizChart').getContext('2d');
    if (mainChart) {
        mainChart.destroy();
    }

    mainChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatCurrency(context.parsed)}`;
                        }
                    }
                }
            }
        }
    });
}

// Fixed export function with month selection
async function exportToCsv() {
    if (!currentUser) {
        showMessage('오류', '로그인이 필요합니다.');
        return;
    }

    const exportFromDate = document.getElementById('exportFromDate')?.value;
    const exportToDate = document.getElementById('exportToDate')?.value;

    try {
        loadingSpinner.style.display = 'flex';

        // Query all expenses for the user
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        let allExpenses = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            allExpenses.push({
                id: doc.id,
                ...data
            });
        });

        console.log('Total expenses found:', allExpenses.length);

        // Apply date filters if they exist
        if (exportFromDate || exportToDate) {
            allExpenses = allExpenses.filter(exp => {
                const expDate = exp.date;
                const afterStart = !exportFromDate || expDate >= exportFromDate;
                const beforeEnd = !exportToDate || expDate <= exportToDate;
                return afterStart && beforeEnd;
            });
        }

        console.log('Filtered expenses:', allExpenses.length);

        if (allExpenses.length === 0) {
            showMessage('내보내기 실패', '선택된 날짜 범위에 데이터가 없습니다.');
            loadingSpinner.style.display = 'none';
            return;
        }

        // Create CSV content with proper UTF-8 BOM for Korean characters
        const headers = ['날짜', '유형', '내용', '카테고리', '금액', '결제 수단'];
        let csvContent = '\uFEFF' + headers.join(',') + '\n'; // BOM for UTF-8

        allExpenses.forEach(data => {
            const row = [
                `"${data.date}"`,
                `"${data.type === 'expense' ? '지출' : '수입'}"`,
                `"${(data.description || '').replace(/"/g, '""')}"`,
                `"${(data.category || '').replace(/"/g, '""')}"`,
                `"${data.amount || 0}"`,
                `"${(data.card || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;'
        });

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);

        // Create filename with date range if specified
        let filename = '가계부_내역';
        if (exportFromDate && exportToDate) {
            filename += `_${exportFromDate}_to_${exportToDate}`;
        } else if (exportFromDate) {
            filename += `_from_${exportFromDate}`;
        } else if (exportToDate) {
            filename += `_until_${exportToDate}`;
        }
        filename += '.csv';

        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the URL object
        URL.revokeObjectURL(url);

        showMessage('내보내기 완료', `${allExpenses.length}개의 항목이 CSV 파일로 다운로드되었습니다.`);

    } catch (error) {
        console.error("Error exporting data: ", error);
        showMessage('오류', `데이터 내보내기 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}
// Helper function to show modals
function showMessageModal(title, body) {
    const modalTitle = document.getElementById('messageModalTitle');
    const modalBody = document.getElementById('messageModalBody');
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = body;
    const modal = new bootstrap.Modal(document.getElementById('messageModal'));
    modal.show();
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Check for user login state on page load
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showApp();
            loadUserData();
        } else {
            loadingSpinner.style.display = 'none';
            loginPage.style.display = 'block';
            appContainer.style.display = 'none';
        }
    });

    setupNavigation();

    // Set today's date on add form
    const today = getLocalDate();
    if (document.getElementById('date')) {
        document.getElementById('date').value = today;
    }

    // Auth forms event listeners
    if (document.getElementById('loginForm')) document.getElementById('loginForm').addEventListener('submit', handleEmailLogin);
    if (document.getElementById('googleSignInBtn')) document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
    if (document.getElementById('signupForm')) document.getElementById('signupForm').addEventListener('submit', handleEmailSignup);
    if (document.getElementById('logoutBtn')) document.getElementById('logoutBtn').addEventListener('click', logout);
    if (document.getElementById('signupLink')) {
        document.getElementById('signupLink').addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.login-card').style.display = 'none';
            document.getElementById('signup-form').style.display = 'block';
        });
    }
    if (document.getElementById('loginLink')) {
        document.getElementById('loginLink').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signup-form').style.display = 'none';
            document.querySelector('.login-card').style.display = 'block';
        });
    }
    if (document.getElementById('forgotPasswordLink')) document.getElementById('forgotPasswordLink').addEventListener('click', handlePasswordReset);
    if (document.getElementById('saveEditBtn')) document.getElementById('saveEditBtn').addEventListener('click', saveEdit);

    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Expose functions to global scope for onclick attributes in HTML
    window.openEditModal = openEditModal;
    window.deleteExpense = deleteExpense;
    window.showMessageModal = showMessageModal;
});