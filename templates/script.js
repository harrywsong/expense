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

    document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
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
        document.getElementById('dashboardChart').style.display = 'none';
        document.getElementById('no-dashboard-data').style.display = 'block';
        return;
    } else {
        document.getElementById('dashboardChart').style.display = 'block';
        document.getElementById('no-dashboard-data').style.display = 'none';
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
        refreshTable(); // This line updates "All Transactions"
        showMonthlyExpenses(); // This line updates "Monthly Breakdown"
        showMessage('성공', '항목이 성공적으로 추가되었습니다.');
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
        // Define the fixed categories you want to include
        const fixedCategories = new Set([
            '그로서리',
            '외식',
            '주유+주차',
            '고정비용'
        ]);

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('type', '==', 'expense')
        );
        const querySnapshot = await getDocs(q);

        // Add categories from Firestore to the set
        querySnapshot.forEach(doc => {
            fixedCategories.add(doc.data().category);
        });

        // Clear existing options
        select.innerHTML = '<option value="">전체</option>';

        // Convert the set to an array, sort it, and populate the dropdown
        Array.from(fixedCategories).sort().forEach(cat => {
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
            orderBy('date', 'desc')
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
    const chartElement = document.getElementById('vizChart');
    const noDataMessage = document.getElementById('no-viz-data');

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
            chartElement.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        } else {
            chartElement.style.display = 'block';
            noDataMessage.style.display = 'none';
        }

        const ctx = chartElement;
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
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        };

        if (type === 'bar') {
            config.options.scales = {
                y: {
                    beginAtZero: true
                }
            };
        }

        mainChart = new Chart(ctx, config);
    } catch (error) {
        console.error('Error plotting chart:', error);
        chartElement.style.display = 'none';
        noDataMessage.style.display = 'block';
    }
}

async function compareExpenses() {
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }

    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;
    const chartElement = document.getElementById('compareChart');
    const noDataMessage = document.getElementById('no-compare-data');

    if (!month1 || !month2) {
        chartElement.style.display = 'none';
        noDataMessage.style.display = 'block';
        return;
    }

    try {
        const q1 = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month1),
            where('type', '==', 'expense')
        );
        const q2 = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month2),
            where('type', '==', 'expense')
        );

        const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

        const data1 = {};
        snapshot1.forEach(doc => {
            const exp = doc.data();
            data1[exp.category] = (data1[exp.category] || 0) + exp.amount;
        });

        const data2 = {};
        snapshot2.forEach(doc => {
            const exp = doc.data();
            data2[exp.category] = (data2[exp.category] || 0) + exp.amount;
        });

        const allCategories = [...new Set([...Object.keys(data1), ...Object.keys(data2)])];
        const values1 = allCategories.map(cat => data1[cat] || 0);
        const values2 = allCategories.map(cat => data2[cat] || 0);

        if (allCategories.length === 0) {
            chartElement.style.display = 'none';
            noDataMessage.style.display = 'block';
            return;
        } else {
            chartElement.style.display = 'block';
            noDataMessage.style.display = 'none';
        }

        const ctx = chartElement;
        if (!ctx) return;

        mainChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allCategories,
                datasets: [
                    {
                        label: month1,
                        data: values1,
                        backgroundColor: '#5D5FEF',
                    },
                    {
                        label: month2,
                        data: values2,
                        backgroundColor: '#FF6384',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: false },
                    y: { stacked: false, beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Error comparing expenses:', error);
        chartElement.style.display = 'none';
        noDataMessage.style.display = 'block';
    }
}

async function exportCSV() {
    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showMessage('내보내기 실패', '내보낼 데이터가 없습니다.');
            return;
        }

        let csvContent = "날짜,유형,내용,카테고리,금액,결제수단\n";

        querySnapshot.forEach(doc => {
            const exp = doc.data();
            const row = `${exp.date},${exp.type === 'income' ? '수입' : '지출'},"${exp.description.replace(/"/g, '""')}",${exp.category},${exp.amount},${exp.card}\n`;
            csvContent += row;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "가계부_내역.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage('내보내기 완료', 'CSV 파일이 성공적으로 생성되었습니다.');

    } catch (error) {
        console.error('Error exporting CSV:', error);
        showMessage('내보내기 실패', 'CSV 파일 생성 중 오류가 발생했습니다.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleEmailLogin);
    document.getElementById('signupForm').addEventListener('submit', handleEmailSignup);
    document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('signupLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });
    document.getElementById('loginLink').addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.login-card').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
    });
    document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
        e.preventDefault();
        handlePasswordReset();
    });
    document.getElementById('saveEditBtn').addEventListener('click', saveEdit);

    // Initial setups
    setupNavigation();
    document.getElementById('date').value = getLocalDate();

    // Dark Mode Toggle
    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        const icon = document.getElementById('theme-toggle').querySelector('i');
        icon.classList.toggle('fa-sun', isDarkMode);
        icon.classList.toggle('fa-moon', !isDarkMode);
    });

    // Apply saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-toggle').querySelector('i');
        icon.classList.add('fa-sun');
        icon.classList.remove('fa-moon');
    }
});

window.openEditModal = openEditModal;
window.deleteExpense = deleteExpense;