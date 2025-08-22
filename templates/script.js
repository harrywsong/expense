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
let currentLanguage = 'ko';

const translations = {
    'ko': {
        appTitle: '가계부',
        appTitleSidebar: '가계부',
        appSubtitle: '개인 재정 관리 시스템',
        googleSignInBtn: 'Google로 로그인',
        or: '또는',
        email: '이메일',
        password: '비밀번호',
        loginBtn: '로그인',
        noAccount: '계정이 없으신가요? 회원가입',
        forgotPassword: '비밀번호를 잊으셨나요?',
        signupTitle: '회원가입',
        newAccountSubtitle: '새 계정을 만드세요',
        confirmPassword: '비밀번호 확인',
        signupBtn: '회원가입',
        alreadyAccount: '이미 계정이 있으신가요? 로그인',
        dashboardLink: '대시보드',
        addLink: '항목 추가',
        viewLink: '전체 내역',
        monthlyLink: '월별 내역',
        budgetsLink: '예산 관리',
        vizLink: '시각화',
        compareLink: '월별 비교',
        exportLink: '데이터 내보내기',
        themeToggle: '다크 모드',
        languageToggle: '한국어',
        logout: '로그아웃',
        dashboardTitle: '대시보드',
        thisMonthIncome: '이번 달 수입',
        thisMonthExpense: '이번 달 지출',
        lastMonthExpense: '지난 달 지출',
        netIncome: '순수입',
        expenseByCategoryTitle: '카테고리별 지출',
        addTitle: '항목 추가',
        type: '유형',
        expense: '지출',
        income: '수입',
        date: '날짜',
        category: '카테고리',
        selectCategory: '카테고리 선택',
        'category-grocery': '그로서리',
        'category-dining': '외식',
        'category-transportation': '교통비',
        'category-entertainment': '유흥',
        'category-shopping': '쇼핑',
        'category-health': '건강/의료',
        'category-fixed': '고정비용',
        'category-salary': '급여',
        'category-other': '기타',
        customCategory: '직접 입력',
        description: '설명',
        amount: '금액',
        paymentMethod: '결제 수단',
        addEntryBtn: '항목 추가',
        viewAllTitle: '전체 내역',
        fromDate: '시작일',
        toDate: '종료일',
        categoryFilter: '카테고리 필터',
        allCategories: '모든 카테고리',
        descriptionSearch: '설명 검색',
        tableDate: '날짜',
        tableDescription: '설명',
        tableCategory: '카테고리',
        tableAmount: '금액',
        tablePaymentMethod: '결제 수단',
        tableActions: '액션',
        editEntryModalTitle: '내역 수정',
        saveChanges: '저장',
        monthlyTitle: '월별 내역',
        monthlyIncome: '월 수입',
        monthlyExpense: '월 지출',
        budgetsTitle: '예산 관리',
        setBudget: '예산 설정',
        vizTitle: '시각화',
        selectMonth: '월 선택',
        chartType: '차트 유형',
        pieChart: '파이 차트',
        barChart: '바 차트',
        compareTitle: '월별 비교',
        firstMonth: '첫 번째 월',
        secondMonth: '두 번째 월',
        exportTitle: '데이터 내보내기',
        exportDescription: '모든 지출 데이터를 CSV 파일로 다운로드합니다.',
        downloadCsv: 'CSV 다운로드',
        close: '닫기',

        // Messages
        loginSuccess: '로그인 성공',
        welcome: '환영합니다!',
        loginFailed: '로그인에 실패했습니다.',
        userNotFound: '등록되지 않은 이메일입니다.',
        wrongPassword: '비밀번호가 올바르지 않습니다.',
        invalidEmail: '유효하지 않은 이메일 주소입니다.',
        signupFailed: '회원가입에 실패했습니다.',
        passwordMismatch: '비밀번호가 일치하지 않습니다.',
        passwordTooShort: '비밀번호는 6자 이상이어야 합니다.',
        signupComplete: '회원가입 완료',
        signupWelcome: '회원가입이 완료되었습니다. 환영합니다!',
        emailInUse: '이미 등록된 이메일입니다.',
        weakPassword: '비밀번호가 너무 약합니다.',
        googleLoginSuccess: 'Google 계정으로 로그인되었습니다.',
        googleLoginFailed: 'Google 로그인에 실패했습니다.',
        popupClosed: '로그인이 취소되었습니다.',
        popupBlocked: '팝업이 차단되었습니다. 팝업을 허용해주세요.',
        resetPasswordTitle: '비밀번호 재설정',
        resetPasswordSent: '비밀번호 재설정 이메일이 발송되었습니다.',
        error: '오류',
        enterEmail: '이메일을 입력해주세요.',
        resetPasswordFailed: '비밀번호 재설정 이메일 발송에 실패했습니다.',
        expenseAdded: '지출 항목이 성공적으로 추가되었습니다!',
        incomeAdded: '수입 항목이 성공적으로 추가되었습니다!',
        budgetSet: '예산이 성공적으로 설정되었습니다.',
        budgetUpdated: '예산이 성공적으로 업데이트되었습니다.',
        budgetDeleted: '예산이 성공적으로 삭제되었습니다.',
        deleteConfirm: '정말로 삭제하시겠습니까?',
        entryDeleted: '항목이 삭제되었습니다.',
        entryUpdated: '항목이 성공적으로 업데이트되었습니다!',
        enterCategory: '카테고리를 입력하세요.',
        dataNotFound: '데이터를 찾을 수 없습니다.',
        noDataToExport: '내보낼 데이터가 없습니다.',
        vizExpense: '지출',
        vizIncome: '수입',
        noData: '데이터 없음',
        netIncomeCompare: '순수입 비교',
        totalIncomeCompare: '총 수입 비교',
        totalExpenseCompare: '총 지출 비교',
        noDataCompare: '두 기간 모두 데이터가 없습니다.',
    },
    'en': {
        appTitle: 'Household Ledger',
        appTitleSidebar: 'Ledger',
        appSubtitle: 'Personal Finance Management System',
        googleSignInBtn: 'Sign in with Google',
        or: 'or',
        email: 'Email',
        password: 'Password',
        loginBtn: 'Login',
        noAccount: 'No account? Sign up',
        forgotPassword: 'Forgot your password?',
        signupTitle: 'Sign Up',
        newAccountSubtitle: 'Create a new account',
        confirmPassword: 'Confirm Password',
        signupBtn: 'Sign Up',
        alreadyAccount: 'Already have an account? Login',
        dashboardLink: 'Dashboard',
        addLink: 'Add Entry',
        viewLink: 'All Entries',
        monthlyLink: 'Monthly',
        budgetsLink: 'Budgets',
        vizLink: 'Visualization',
        compareLink: 'Compare',
        exportLink: 'Export Data',
        themeToggle: 'Dark Mode',
        languageToggle: 'English',
        logout: 'Logout',
        dashboardTitle: 'Dashboard',
        thisMonthIncome: 'This Month\'s Income',
        thisMonthExpense: 'This Month\'s Expense',
        lastMonthExpense: 'Last Month\'s Expense',
        netIncome: 'Net Income',
        expenseByCategoryTitle: 'Expenses by Category',
        addTitle: 'Add Entry',
        type: 'Type',
        expense: 'Expense',
        income: 'Income',
        date: 'Date',
        category: 'Category',
        selectCategory: 'Select a category',
        'category-grocery': 'Grocery',
        'category-dining': 'Dining Out',
        'category-transportation': 'Transportation',
        'category-entertainment': 'Entertainment',
        'category-shopping': 'Shopping',
        'category-health': 'Health/Medical',
        'category-fixed': 'Fixed Costs',
        'category-salary': 'Salary',
        'category-other': 'Other',
        customCategory: 'Enter custom category',
        description: 'Description',
        amount: 'Amount',
        paymentMethod: 'Payment Method',
        addEntryBtn: 'Add Entry',
        viewAllTitle: 'All Entries',
        fromDate: 'From Date',
        toDate: 'To Date',
        categoryFilter: 'Category Filter',
        allCategories: 'All Categories',
        descriptionSearch: 'Search by description',
        tableDate: 'Date',
        tableDescription: 'Description',
        tableCategory: 'Category',
        tableAmount: 'Amount',
        tablePaymentMethod: 'Payment Method',
        tableActions: 'Actions',
        editEntryModalTitle: 'Edit Entry',
        saveChanges: 'Save Changes',
        monthlyTitle: 'Monthly History',
        monthlyIncome: 'Monthly Income',
        monthlyExpense: 'Monthly Expense',
        budgetsTitle: 'Budget Management',
        setBudget: 'Set Budget',
        vizTitle: 'Visualization',
        selectMonth: 'Select Month',
        chartType: 'Chart Type',
        pieChart: 'Pie Chart',
        barChart: 'Bar Chart',
        compareTitle: 'Monthly Comparison',
        firstMonth: 'First Month',
        secondMonth: 'Second Month',
        exportTitle: 'Export Data',
        exportDescription: 'Download all expense data as a CSV file.',
        downloadCsv: 'Download CSV',
        close: 'Close',

        // Messages
        loginSuccess: 'Login Successful',
        welcome: 'Welcome!',
        loginFailed: 'Login failed.',
        userNotFound: 'Email not registered.',
        wrongPassword: 'Incorrect password.',
        invalidEmail: 'Invalid email address.',
        signupFailed: 'Sign up failed.',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password must be at least 6 characters long.',
        signupComplete: 'Sign Up Complete',
        signupWelcome: 'Sign up is complete. Welcome!',
        emailInUse: 'Email is already in use.',
        weakPassword: 'Password is too weak.',
        googleLoginSuccess: 'Signed in with Google account.',
        googleLoginFailed: 'Google login failed.',
        popupClosed: 'Login was canceled.',
        popupBlocked: 'Popup blocked. Please allow popups.',
        resetPasswordTitle: 'Password Reset',
        resetPasswordSent: 'A password reset email has been sent.',
        error: 'Error',
        enterEmail: 'Please enter your email.',
        resetPasswordFailed: 'Failed to send password reset email.',
        expenseAdded: 'Expense entry successfully added!',
        incomeAdded: 'Income entry successfully added!',
        budgetSet: 'Budget successfully set.',
        budgetUpdated: 'Budget successfully updated.',
        budgetDeleted: 'Budget successfully deleted.',
        deleteConfirm: 'Are you sure you want to delete?',
        entryDeleted: 'Entry has been deleted.',
        entryUpdated: 'Entry successfully updated!',
        enterCategory: 'Please enter a category.',
        dataNotFound: 'Data not found.',
        noDataToExport: 'No data to export.',
        vizExpense: 'Expense',
        vizIncome: 'Income',
        noData: 'No Data',
        netIncomeCompare: 'Net Income Comparison',
        totalIncomeCompare: 'Total Income Comparison',
        totalExpenseCompare: 'Total Expense Comparison',
        noDataCompare: 'No data for both periods.',
    }
};

// UI elements
const loadingSpinner = document.getElementById('loading-spinner');
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const languageToggleBtn = document.getElementById('language-toggle');

// Helper function to update text
function updateLanguage(lang) {
    document.querySelectorAll('[data-lang-key]').forEach(element => {
        const key = element.getAttribute('data-lang-key');
        if (translations[lang] && translations[lang][key]) {
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });
    // Special case for the language button itself
    languageToggleBtn.querySelector('span').textContent = translations[lang]['languageToggle'];

    // Update the HTML lang attribute
    document.documentElement.lang = lang;
}

// Function to handle language switching
function toggleLanguage() {
    const newLang = currentLanguage === 'ko' ? 'en' : 'ko';
    currentLanguage = newLang;
    updateLanguage(newLang);
    localStorage.setItem('language', newLang);
}

// Event listener for the language toggle button
if (languageToggleBtn) {
    languageToggleBtn.addEventListener('click', toggleLanguage);
}

// Load language preference from local storage on page load
document.addEventListener('DOMContentLoaded', () => {
    const storedLang = localStorage.getItem('language');
    if (storedLang) {
        currentLanguage = storedLang;
    }
    updateLanguage(currentLanguage);
});

// Authentication functions
async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        loadingSpinner.style.display = 'flex';
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        showMessage(translations[currentLanguage].loginSuccess, translations[currentLanguage].welcome);
    } catch (error) {
        console.error('Login error:', error);
        let message = translations[currentLanguage].loginFailed;
        if (error.code === 'auth/user-not-found') {
            message = translations[currentLanguage].userNotFound;
        } else if (error.code === 'auth/wrong-password') {
            message = translations[currentLanguage].wrongPassword;
        } else if (error.code === 'auth/invalid-email') {
            message = translations[currentLanguage].invalidEmail;
        }
        showMessage(translations[currentLanguage].loginFailed, message);
        loadingSpinner.style.display = 'none';
    }
}

async function handleEmailSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showMessage(translations[currentLanguage].signupFailed, translations[currentLanguage].passwordMismatch);
        return;
    }

    if (password.length < 6) {
        showMessage(translations[currentLanguage].signupFailed, translations[currentLanguage].passwordTooShort);
        return;
    }

    try {
        loadingSpinner.style.display = 'flex';
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;

        // Initialize user data in Firestore
        await initializeUserData(currentUser.uid);
        showMessage(translations[currentLanguage].signupComplete, translations[currentLanguage].signupWelcome);
    } catch (error) {
        console.error('Signup error:', error);
        let message = translations[currentLanguage].signupFailed;
        if (error.code === 'auth/email-already-in-use') {
            message = translations[currentLanguage].emailInUse;
        } else if (error.code === 'auth/invalid-email') {
            message = translations[currentLanguage].invalidEmail;
        } else if (error.code === 'auth/weak-password') {
            message = translations[currentLanguage].weakPassword;
        }
        showMessage(translations[currentLanguage].signupFailed, message);
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

        showMessage(translations[currentLanguage].loginSuccess, translations[currentLanguage].googleLoginSuccess);
    } catch (error) {
        console.error('Google sign-in error:', error);
        let message = translations[currentLanguage].googleLoginFailed;
        if (error.code === 'auth/popup-closed-by-user') {
            message = translations[currentLanguage].popupClosed;
        } else if (error.code === 'auth/popup-blocked') {
            message = translations[currentLanguage].popupBlocked;
        }
        showMessage(translations[currentLanguage].loginFailed, message);
        loadingSpinner.style.display = 'none';
    }
}

async function handlePasswordReset() {
    const email = document.getElementById('emailInput').value;
    if (!email) {
        showMessage(translations[currentLanguage].error, translations[currentLanguage].enterEmail);
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showMessage(translations[currentLanguage].resetPasswordTitle, translations[currentLanguage].resetPasswordSent);
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage(translations[currentLanguage].error, translations[currentLanguage].resetPasswordFailed);
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

    if (categorySelect.value === '기타' || categorySelect.value === 'Other') {
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

    if (categorySelect.value === '기타' || categorySelect.value === 'Other') {
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
    if (categorySelect.value === '기타' || categorySelect.value === 'Other') {
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
    if (categorySelect.value === '기타' || categorySelect.value === 'Other') {
        return document.getElementById('customCategory').value.trim();
    }
    return categorySelect.value;
}

// Get final category value for edit modal
function getFinalEditCategory() {
    const categorySelect = document.getElementById('edit-category');
    if (categorySelect.value === '기타' || categorySelect.value === 'Other') {
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
    document.getElementById('budgetCategory').addEventListener('change', handleBudgetCategoryChange);
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
    let locale = currentLanguage === 'ko' ? 'ko-KR' : 'en-CA';
    let currency = 'KRW';
    if (currentLanguage === 'en') {
        currency = 'CAD';
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(amount);
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
        labels.push(translations[currentLanguage].noData);
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
                    label: translations[currentLanguage].vizExpense,
                    data: values,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
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
                        beginAtZero: true
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
        showMessage(translations[currentLanguage].error, translations[currentLanguage].enterCategory);
        return;
    }

    const newExpense = {
        userId: currentUser.uid,
        type: document.getElementById('type').value,
        date: document.getElementById('date').value || getLocalDate(),
        description: document.getElementById('description').value.trim(),
        category: finalCategory,
        amount: parseFloat(document.getElementById('amount').value),
        card: document.getElementById('card').value.trim(),
        month: getMonthKey(document.getElementById('date').value || getLocalDate()),
        timestamp: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, 'expenses'), newExpense);
        showMessage(translations[currentLanguage].addTitle, newExpense.type === 'income' ? translations[currentLanguage].incomeAdded : translations[currentLanguage].expenseAdded);
        document.getElementById('addForm').reset();
        handleCategoryChange(); // Reset custom category input visibility
        renderDashboard();
    } catch (error) {
        console.error('Error adding document: ', error);
        showMessage(translations[currentLanguage].error, 'Failed to add entry.');
    }
}

async function refreshTable() {
    const tableBody = document.getElementById('expenseTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    try {
        const fromDateStr = document.getElementById('fromDate').value;
        const toDateStr = document.getElementById('toDate').value;
        const filterCategory = document.getElementById('filterCategory').value;
        const descSearch = document.getElementById('descSearch').value.toLowerCase();

        let q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const expenses = [];
        querySnapshot.forEach(doc => {
            expenses.push({ id: doc.id, ...doc.data() });
        });

        const filteredExpenses = expenses.filter(exp => {
            const dateMatch = (!fromDateStr || exp.date >= fromDateStr) && (!toDateStr || exp.date <= toDateStr);
            const categoryMatch = (!filterCategory || exp.category === filterCategory);
            const descMatch = (!descSearch || exp.description.toLowerCase().includes(descSearch));
            return dateMatch && categoryMatch && descMatch;
        });

        if (filteredExpenses.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">${translations[currentLanguage].dataNotFound}</td></tr>`;
            return;
        }

        filteredExpenses.forEach(exp => {
            const row = tableBody.insertRow();
            row.className = exp.type === 'income' ? 'table-success' : '';
            row.innerHTML = `
                <td>${exp.date}</td>
                <td>${exp.description}</td>
                <td>${exp.category}</td>
                <td>${formatCurrency(exp.amount)}</td>
                <td>${exp.card}</td>
                <td>
                    <button class="btn btn-sm btn-info edit-btn" data-id="${exp.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${exp.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => showEditModal(e.target.closest('button').dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => deleteEntry(e.target.closest('button').dataset.id));
        });

    } catch (error) {
        console.error('Error refreshing table:', error);
    }
}

async function deleteEntry(id) {
    if (confirm(translations[currentLanguage].deleteConfirm)) {
        try {
            await deleteDoc(doc(db, 'expenses', id));
            showMessage(translations[currentLanguage].viewAllTitle, translations[currentLanguage].entryDeleted);
            refreshTable();
            renderDashboard();
        } catch (error) {
            console.error('Error removing document: ', error);
        }
    }
}

async function showEditModal(id) {
    try {
        const docSnap = await getDoc(doc(db, 'expenses', id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('edit-id').value = id;
            document.getElementById('edit-date').value = data.date;
            document.getElementById('edit-type').value = data.type;
            document.getElementById('edit-description').value = data.description;
            document.getElementById('edit-amount').value = data.amount;
            document.getElementById('edit-card').value = data.card;

            // Handle category dropdown
            const editCategorySelect = document.getElementById('edit-category');
            const editCustomCategory = document.getElementById('editCustomCategory');
            const editCustomCategoryGroup = document.getElementById('editCustomCategoryGroup');
            const categoryOptions = Array.from(editCategorySelect.options).map(o => o.value);

            if (categoryOptions.includes(data.category)) {
                editCategorySelect.value = data.category;
                editCustomCategoryGroup.style.display = 'none';
            } else {
                editCategorySelect.value = '기타';
                editCustomCategory.value = data.category;
                editCustomCategoryGroup.style.display = 'block';
            }

            // Show the modal
            const editModal = new bootstrap.Modal(document.getElementById('editModal'));
            editModal.show();
        } else {
            console.log("No such document!");
            showMessage(translations[currentLanguage].error, translations[currentLanguage].dataNotFound);
        }
    } catch (error) {
        console.error('Error fetching document:', error);
    }
}

async function updateEntry(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const finalCategory = getFinalEditCategory();
    const updatedEntry = {
        date: document.getElementById('edit-date').value,
        type: document.getElementById('edit-type').value,
        description: document.getElementById('edit-description').value.trim(),
        category: finalCategory,
        amount: parseFloat(document.getElementById('edit-amount').value),
        card: document.getElementById('edit-card').value.trim(),
        month: getMonthKey(document.getElementById('edit-date').value),
    };

    try {
        const docRef = doc(db, 'expenses', id);
        await updateDoc(docRef, updatedEntry);
        showMessage(translations[currentLanguage].editEntryModalTitle, translations[currentLanguage].entryUpdated);
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        modal.hide();
        refreshTable();
        renderDashboard();
    } catch (error) {
        console.error('Error updating document:', error);
    }
}

document.getElementById('editForm').addEventListener('submit', updateEntry);


async function populateFilterCategories() {
    const filterSelect = document.getElementById('filterCategory');
    if (!filterSelect) return;

    // Clear existing options, but keep the default "All Categories"
    while (filterSelect.options.length > 1) {
        filterSelect.remove(1);
    }

    try {
        const categoriesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid)
        );
        const querySnapshot = await getDocs(categoriesQuery);
        const categories = new Set();
        querySnapshot.forEach(doc => {
            const category = doc.data().category;
            if (category) {
                categories.add(category);
            }
        });

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating categories:', error);
    }
}

async function showMonthlyExpenses(monthKey = null) {
    const monthlyTableBody = document.getElementById('monthlyTableBody');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    monthlyTableBody.innerHTML = '';
    const now = new Date();
    const currentMonth = monthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    currentMonthDisplay.textContent = currentMonth;

    let totalIncome = 0;
    let totalExpense = 0;

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', currentMonth),
            orderBy('date')
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            monthlyTableBody.innerHTML = `<tr><td colspan="5" class="text-center">${translations[currentLanguage].dataNotFound}</td></tr>`;
            return;
        }

        querySnapshot.forEach(doc => {
            const expense = doc.data();
            const row = monthlyTableBody.insertRow();
            row.className = expense.type === 'income' ? 'table-success' : '';
            row.innerHTML = `
                <td>${expense.date}</td>
                <td>${expense.description}</td>
                <td>${expense.category}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td>${expense.card}</td>
            `;

            if (expense.type === 'income') {
                totalIncome += expense.amount;
            } else {
                totalExpense += expense.amount;
            }
        });

        document.getElementById('monthly-income').textContent = formatCurrency(totalIncome);
        document.getElementById('monthly-expense').textContent = formatCurrency(totalExpense);

    } catch (error) {
        console.error('Error showing monthly expenses:', error);
    }
}

async function renderBudgetList() {
    const budgetList = document.getElementById('budgetList');
    budgetList.innerHTML = '';
    try {
        const budgetsRef = collection(db, 'budgets');
        const q = query(budgetsRef, where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            budgetList.innerHTML = `<p>${translations[currentLanguage].dataNotFound}</p>`;
            return;
        }

        querySnapshot.forEach(doc => {
            const budget = doc.data();
            const budgetCard = document.createElement('div');
            budgetCard.className = 'card shadow-sm mb-3';
            budgetCard.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title">${budget.category}</h5>
                        <p class="card-text">${translations[currentLanguage].budgetsTitle}: ${formatCurrency(budget.amount)}</p>
                    </div>
                    <div>
                        <button class="btn btn-danger btn-sm delete-budget-btn" data-id="${doc.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            budgetList.appendChild(budgetCard);
        });

        document.querySelectorAll('.delete-budget-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteBudget(btn.dataset.id));
        });

    } catch (error) {
        console.error('Error rendering budget list:', error);
    }
}

async function setBudget(e) {
    e.preventDefault();
    const category = document.getElementById('budgetCategory').value;
    const customCategory = document.getElementById('budgetCustomCategory').value.trim();
    const finalCategory = category === '기타' || category === 'Other' ? customCategory : category;
    const amount = parseFloat(document.getElementById('budgetAmount').value);

    if (!finalCategory || isNaN(amount) || amount <= 0) {
        showMessage(translations[currentLanguage].error, 'Please enter a valid category and amount.');
        return;
    }

    try {
        const budgetDocId = `${currentUser.uid}_${finalCategory}`;
        const budgetRef = doc(db, 'budgets', budgetDocId);
        await setDoc(budgetRef, {
            userId: currentUser.uid,
            category: finalCategory,
            amount: amount
        });
        showMessage(translations[currentLanguage].budgetsTitle, translations[currentLanguage].budgetSet);
        document.getElementById('budgetForm').reset();
        handleBudgetCategoryChange();
        renderBudgetList();
    } catch (error) {
        console.error('Error setting budget:', error);
        showMessage(translations[currentLanguage].error, 'Failed to set budget.');
    }
}

async function deleteBudget(id) {
    if (confirm(translations[currentLanguage].deleteConfirm)) {
        try {
            await deleteDoc(doc(db, 'budgets', id));
            showMessage(translations[currentLanguage].budgetsTitle, translations[currentLanguage].budgetDeleted);
            renderBudgetList();
        } catch (error) {
            console.error('Error deleting budget:', error);
        }
    }
}

async function checkBudgets() {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgetAlertsDiv = document.getElementById('budget-alerts');
    budgetAlertsDiv.innerHTML = '';

    try {
        // Fetch budgets
        const budgetsQuery = query(collection(db, 'budgets'), where('userId', '==', currentUser.uid));
        const budgetsSnapshot = await getDocs(budgetsQuery);

        if (budgetsSnapshot.empty) {
            return;
        }

        // Fetch this month's expenses
        const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', thisMonthKey),
            where('type', '==', 'expense')
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const categoryExpenses = {};
        expensesSnapshot.forEach(doc => {
            const exp = doc.data();
            categoryExpenses[exp.category] = (categoryExpenses[exp.category] || 0) + exp.amount;
        });

        // Compare and show alerts
        budgetsSnapshot.forEach(doc => {
            const budget = doc.data();
            const spent = categoryExpenses[budget.category] || 0;
            const percentage = (spent / budget.amount) * 100;

            if (percentage >= 100) {
                const alertHtml = `
                    <div class="alert alert-danger" role="alert">
                        <strong>Budget Alert:</strong> You have exceeded your budget for <strong>${budget.category}</strong>. You have spent ${formatCurrency(spent)} of your ${formatCurrency(budget.amount)} budget.
                    </div>
                `;
                budgetAlertsDiv.innerHTML += alertHtml;
            } else if (percentage >= 80) {
                const alertHtml = `
                    <div class="alert alert-warning" role="alert">
                        <strong>Budget Warning:</strong> You are close to exceeding your budget for <strong>${budget.category}</strong>. You have spent ${formatCurrency(spent)} of your ${formatCurrency(budget.amount)} budget.
                    </div>
                `;
                budgetAlertsDiv.innerHTML += alertHtml;
            }
        });

    } catch (error) {
        console.error('Error checking budgets:', error);
    }
}

async function plotChart() {
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }
    const month = document.getElementById('vizMonth').value;
    const type = document.getElementById('vizType').value;

    if (!month) {
        return;
    }

    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', month)
        );
        const querySnapshot = await getDocs(q);
        const expenses = {};
        const incomes = {};

        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'expense') {
                expenses[data.category] = (expenses[data.category] || 0) + data.amount;
            } else {
                incomes[data.category] = (incomes[data.category] || 0) + data.amount;
            }
        });

        let labels, dataValues;
        const totalExpense = Object.values(expenses).reduce((sum, val) => sum + val, 0);
        const totalIncome = Object.values(incomes).reduce((sum, val) => sum + val, 0);

        if (type === 'pie') {
            labels = Object.keys(expenses);
            dataValues = Object.values(expenses);
        } else {
            labels = [translations[currentLanguage].vizIncome, translations[currentLanguage].vizExpense];
            dataValues = [totalIncome, totalExpense];
        }

        if (dataValues.every(val => val === 0)) {
            labels = [translations[currentLanguage].noData];
            dataValues = [1]; // Set a dummy value to show an empty circle on pie chart
        }

        const ctx = document.getElementById('mainChart').getContext('2d');
        mainChart = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: translations[currentLanguage].vizExpense,
                    data: dataValues,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#7F8C8D'],
                }]
            },
            options: {
                responsive: true,
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
                                if (context.parsed.y !== undefined) {
                                    label += formatCurrency(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error plotting chart:', error);
    }
}

async function compareExpenses() {
    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;
    const compareResultDiv = document.getElementById('compareResult');
    compareResultDiv.innerHTML = '';

    if (!month1 || !month2) return;

    try {
        const data1 = await fetchMonthlySummary(month1);
        const data2 = await fetchMonthlySummary(month2);

        if (!data1 && !data2) {
            compareResultDiv.innerHTML = `<p class="text-center">${translations[currentLanguage].noDataCompare}</p>`;
            return;
        }

        const comparisonHtml = `
            <table class="table table-bordered text-center">
                <thead>
                    <tr>
                        <th>${translations[currentLanguage].category}</th>
                        <th>${month1}</th>
                        <th>${month2}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${translations[currentLanguage].netIncomeCompare}</strong></td>
                        <td>${formatCurrency(data1.netIncome)}</td>
                        <td>${formatCurrency(data2.netIncome)}</td>
                    </tr>
                    <tr>
                        <td><strong>${translations[currentLanguage].totalIncomeCompare}</strong></td>
                        <td class="text-success">${formatCurrency(data1.totalIncome)}</td>
                        <td class="text-success">${formatCurrency(data2.totalIncome)}</td>
                    </tr>
                    <tr>
                        <td><strong>${translations[currentLanguage].totalExpenseCompare}</strong></td>
                        <td class="text-danger">${formatCurrency(data1.totalExpense)}</td>
                        <td class="text-danger">${formatCurrency(data2.totalExpense)}</td>
                    </tr>
                    </tbody>
            </table>
        `;
        compareResultDiv.innerHTML = comparisonHtml;

    } catch (error) {
        console.error('Error comparing expenses:', error);
    }
}

async function fetchMonthlySummary(monthKey) {
    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            where('month', '==', monthKey)
        );
        const querySnapshot = await getDocs(q);
        let totalIncome = 0;
        let totalExpense = 0;
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'income') {
                totalIncome += data.amount;
            } else {
                totalExpense += data.amount;
            }
        });
        return { totalIncome, totalExpense, netIncome: totalIncome - totalExpense };
    } catch (error) {
        console.error('Error fetching monthly summary:', error);
        return null;
    }
}

async function exportToCsv() {
    try {
        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', currentUser.uid),
            orderBy('date')
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showMessage(translations[currentLanguage].error, translations[currentLanguage].noDataToExport);
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = ["Date", "Description", "Category", "Amount", "Type", "Payment Method"];
        csvContent += headers.join(",") + "\n";

        querySnapshot.forEach(doc => {
            const data = doc.data();
            const row = [
                data.date,
                `"${data.description.replace(/"/g, '""')}"`, // Handle quotes in description
                data.category,
                data.amount,
                data.type,
                `"${data.card.replace(/"/g, '""')}"`
            ];
            csvContent += row.join(",") + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "financial_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error exporting data:', error);
        showMessage(translations[currentLanguage].error, 'Failed to export data.');
    }
}

// Event Listeners
document.getElementById('loginForm').addEventListener('submit', handleEmailLogin);
document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);
document.getElementById('signupForm').addEventListener('submit', handleEmailSignup);
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
document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
    e.preventDefault();
    handlePasswordReset();
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
});

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
    document.getElementById('date').value = getLocalDate();
    document.getElementById('edit-date').value = getLocalDate();
    document.getElementById('vizMonth').value = getMonthKey(getLocalDate());
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    document.getElementById('compareMonth1').value = getMonthKey(getLocalDate());
    document.getElementById('compareMonth2').value = getMonthKey(prev.toISOString().substring(0, 10));
    document.getElementById('exportBtn').addEventListener('click', exportToCsv);
});