// script.js

// Import Firebase functions from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1xctlV_gFCGzE9M-u7DJCrXNt73uB_9k",
  authDomain: "accountbook-7bc8e.firebaseapp.com",
  projectId: "accountbook-7bc8e",
  storageBucket: "accountbook-7bc8e.firebasestorage.app",
  messagingSenderId: "1023257780949",
  appId: "1:1023257780949:web:873377e7d3a5d838a7785c"
  // If you are using analytics, add the measurementId
  // measurementId: "G-9X8C4L2116"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// The rest of your script's logic starts here, wrapped in the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Global data objects
    let expenses = {};
    let budgets = {};
    let mainChart = null;
    let dashboardChart = null;
    let userId; // `db` and `auth` are already defined and don't need to be re-declared

    // UI elements
    const loadingSpinner = document.getElementById('loading-spinner');
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));

    // --- Firebase & Authentication Setup ---
    // The `initFirebase()` function is no longer necessary as initialization happens at the top.
    // Instead, we can place the auth state change listener directly here.

    onAuthStateChanged(auth, async (user) => {
        loadingSpinner.style.display = 'none';
        if (user) {
            userId = user.uid;
            loginPage.style.display = 'none';
            appContainer.style.display = 'flex';
            // Show user ID and email on dashboard
            document.getElementById('user-id').textContent = userId;
            document.getElementById('user-email').textContent = user.isAnonymous ? 'Guest' : user.email;

            await loadData();
            renderDashboard();
            populateFilterCategories();
            setupNavigation();
        } else {
            loginPage.style.display = 'flex';
            appContainer.style.display = 'none';
        }
    });

    const signInBtn = document.getElementById('signInBtn');
    signInBtn.addEventListener('click', async () => {
        loadingSpinner.style.display = 'flex';
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Anonymous authentication failed:", error);
            loadingSpinner.style.display = 'none';
            showMessage('오류', '로그인 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
    });

    // Initial sign-in attempt for anonymous users on page load
    signInAnonymously(auth).catch(error => {
        console.error("Anonymous authentication failed:", error);
    });

    // --- Navigation Logic ---
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

                // Special handling for monthly view to show current month
                if (targetId === 'monthly') {
                    showMonthlyExpenses();
                }
                // Special handling for viz view to update chart
                if (targetId === 'viz') {
                     document.getElementById('vizMonth').value = getMonthKey(getLocalDate());
                     plotChart();
                }
                // Special handling for compare view
                if (targetId === 'compare') {
                    const now = new Date();
                    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    document.getElementById('compareMonth1').value = getMonthKey(getLocalDate());
                    document.getElementById('compareMonth2').value = getMonthKey(prev.toISOString().substring(0, 10));
                    compareExpenses();
                }
                // Special handling for view view to refresh table
                if (targetId === 'view') {
                    refreshTable();
                }
            });
        });

        // Set up form submission handlers
        document.getElementById('addForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newExpense = {
                type: document.getElementById('type').value,
                date: document.getElementById('date').value || getLocalDate(),
                description: document.getElementById('description').value,
                category: document.getElementById('category').value,
                amount: parseFloat(document.getElementById('amount').value),
                card: document.getElementById('card').value || '현금',
                timestamp: new Date().toISOString()
            };
            await addExpense(newExpense);
            document.getElementById('addForm').reset();
            document.getElementById('date').value = getLocalDate();
        });

        // Set up filters
        document.getElementById('fromDate').addEventListener('change', refreshTable);
        document.getElementById('toDate').addEventListener('change', refreshTable);
        document.getElementById('filterCategory').addEventListener('change', refreshTable);
        document.getElementById('filterCard').addEventListener('input', refreshTable);
        document.getElementById('minAmount').addEventListener('input', refreshTable);
        document.getElementById('maxAmount').addEventListener('input', refreshTable);
        document.getElementById('descSearch').addEventListener('input', refreshTable);

        // Monthly navigation
        document.getElementById('prevMonthBtn').addEventListener('click', () => {
            const currentMonth = document.getElementById('currentMonthDisplay').textContent;
            const newDate = moment(currentMonth).subtract(1, 'months').format('YYYY-MM');
            showMonthlyExpenses(newDate);
        });

        document.getElementById('nextMonthBtn').addEventListener('click', () => {
            const currentMonth = document.getElementById('currentMonthDisplay').textContent;
            const newDate = moment(currentMonth).add(1, 'months').format('YYYY-MM');
            showMonthlyExpenses(newDate);
        });

        // Viz chart controls
        document.getElementById('vizMonth').addEventListener('change', plotChart);
        document.getElementById('vizType').addEventListener('change', plotChart);

        // Compare controls
        document.getElementById('compareMonth1').addEventListener('change', compareExpenses);
        document.getElementById('compareMonth2').addEventListener('change', compareExpenses);

        // Budget controls
        document.getElementById('addBudgetBtn').addEventListener('click', setBudget);
    }

    // --- Dashboard Rendering ---
    function renderDashboard() {
        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

        const expensesThisMonth = (expenses[thisMonthKey] || []);
        const expensesLastMonth = (expenses[lastMonthKey] || []);

        let incomeThisMonth = 0;
        let expenseThisMonth = 0;
        let expenseLastMonth = 0;

        expensesThisMonth.forEach(exp => {
            if (exp.type === 'income') incomeThisMonth += exp.amount;
            else expenseThisMonth += exp.amount;
        });

        expensesLastMonth.forEach(exp => {
            if (exp.type === 'expense') expenseLastMonth += exp.amount;
        });

        document.getElementById('dashboard-income').textContent = `$${incomeThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('dashboard-expense').textContent = `$${expenseThisMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('dashboard-prev-expense').textContent = `$${expenseLastMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('dashboard-net-income').textContent = `$${(incomeThisMonth - expenseThisMonth).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Render Dashboard Chart
        plotDashboardChart(expensesThisMonth);
        checkBudgets();
    }

    function plotDashboardChart(data) {
        if (dashboardChart) dashboardChart.destroy();

        const categorySums = {};
        data.forEach(exp => {
            if (exp.type === 'expense') {
                categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
            }
        });

        const labels = Object.keys(categorySums);
        const values = Object.values(categorySums);

        const ctx = document.getElementById('dashboardChart').getContext('2d');
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
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // --- Core Data Functions (now using Firestore) ---
    async function loadData() {
        try {
            const appId = "accountbook-7bc8e";
            const userRef = doc(db, 'artifacts', appId, 'users', userId);

            // Real-time listener for expenses
            onSnapshot(collection(userRef, 'expenses'), (snapshot) => {
                expenses = {};
                snapshot.docs.forEach(doc => {
                    const exp = doc.data();
                    const monthKey = getMonthKey(exp.date);
                    if (!expenses[monthKey]) expenses[monthKey] = [];
                    expenses[monthKey].push({ id: doc.id, ...exp });
                });
                console.log('Expenses updated:', expenses);
                renderDashboard();
                refreshTable();
                populateFilterCategories();
            }, (error) => {
                console.error("Error fetching expenses: ", error);
                showMessage('오류', '지출 데이터를 불러오는 데 실패했습니다.');
            });

            // Real-time listener for budgets
            onSnapshot(collection(userRef, 'budgets'), (snapshot) => {
                budgets = {};
                snapshot.docs.forEach(doc => {
                    const budget = doc.data();
                    budgets[doc.id] = budget.amount;
                });
                renderBudgetList();
                checkBudgets();
            }, (error) => {
                console.error("Error fetching budgets: ", error);
            });
        } catch (e) {
            console.error("Error setting up data listeners:", e);
        }
    }

    function findExpenseById(expenseId) {
        for (const monthKey in expenses) {
            const expense = expenses[monthKey].find(e => e.id === expenseId);
            if (expense) return { expense, monthKey };
        }
        return { expense: null, monthKey: null };
    }

    function getMonthKey(dateStr) { return dateStr.substring(0, 7); }

    function getLocalDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function showMessage(title, body) {
        document.getElementById('messageModalTitle').textContent = title;
        document.getElementById('messageModalBody').innerHTML = body;
        messageModal.show();
    }

    async function addExpense(expense) {
        try {
            const appId = "accountbook-7bc8e";
            const expensesCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'expenses');
            await addDoc(expensesCollectionRef, expense);
            showMessage('성공', '항목이 성공적으로 추가되었습니다.');
        } catch (error) {
            showMessage('오류', '항목 추가에 실패했습니다.');
            console.error(error);
        }
    }

    function getFilteredExpenses() {
        let allExpenses = [];
        for (const month in expenses) {
            allExpenses = allExpenses.concat(expenses[month]);
        }
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        const filterCategory = document.getElementById('filterCategory').value;
        const minAmount = parseFloat(document.getElementById('minAmount').value);
        const maxAmount = parseFloat(document.getElementById('maxAmount').value);
        const filterCard = document.getElementById('filterCard').value;
        const descSearch = document.getElementById('descSearch').value.toLowerCase();

        return allExpenses.filter(exp => {
            const dateMatch = (!fromDate || exp.date >= fromDate) && (!toDate || exp.date <= toDate);
            const categoryMatch = (!filterCategory || exp.category === filterCategory);
            const amountMatch = (isNaN(minAmount) || exp.amount >= minAmount) && (isNaN(maxAmount) || exp.amount <= maxAmount);
            const cardMatch = (!filterCard || exp.card === filterCard);
            const descMatch = (!descSearch || exp.description.toLowerCase().includes(descSearch));
            return dateMatch && categoryMatch && amountMatch && cardMatch && descMatch;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function refreshTable() {
        const tableBody = document.getElementById('expenseTable').querySelector('tbody');
        tableBody.innerHTML = '';
        const filteredExpenses = getFilteredExpenses();
        let totalExpense = 0;
        let totalIncome = 0;
        filteredExpenses.forEach(exp => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.date}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.type === 'income' ? '수입' : '지출'}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.description}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.category}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">$${exp.amount.toFixed(2)}</td>
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
        document.getElementById('filteredTotal').textContent = `$${totalExpense.toFixed(2)}`;
        document.getElementById('filteredIncomeTotal').textContent = `$${totalIncome.toFixed(2)}`;
    }

    window.openEditModal = async (expenseId) => {
        const { expense: expenseToEdit } = findExpenseById(expenseId);
        if (!expenseToEdit) {
            showMessage('오류', '항목을 찾을 수 없습니다.');
            return;
        }

        const editModal = new bootstrap.Modal(document.getElementById('editModal'));
        document.getElementById('edit-id').value = expenseToEdit.id;
        document.getElementById('edit-type').value = expenseToEdit.type;
        document.getElementById('edit-date').value = expenseToEdit.date;
        document.getElementById('edit-description').value = expenseToEdit.description;
        document.getElementById('edit-category').value = expenseToEdit.category;
        document.getElementById('edit-amount').value = expenseToEdit.amount;
        document.getElementById('edit-card').value = expenseToEdit.card;
        editModal.show();
    }

    window.saveEdit = async () => {
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        const expenseId = document.getElementById('edit-id').value;
        const updatedExpense = {
            type: document.getElementById('edit-type').value,
            date: document.getElementById('edit-date').value,
            description: document.getElementById('edit-description').value,
            category: document.getElementById('edit-category').value,
            amount: parseFloat(document.getElementById('edit-amount').value),
            card: document.getElementById('edit-card').value
        };

        try {
            const appId = "accountbook-7bc8e";
            const expenseRef = doc(db, 'artifacts', appId, 'users', userId, 'expenses', expenseId);
            await updateDoc(expenseRef, updatedExpense);
            showMessage('성공', '항목이 성공적으로 수정되었습니다.');
            editModal.hide();
        } catch (error) {
            showMessage('오류', '항목 수정에 실패했습니다.');
            console.error(error);
        }
    }

    window.deleteExpense = async (expenseId) => {
        if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;
        try {
            const appId = "accountbook-7bc8e";
            const expenseRef = doc(db, 'artifacts', appId, 'users', userId, 'expenses', expenseId);
            await deleteDoc(expenseRef);
            showMessage('성공', '항목이 성공적으로 삭제되었습니다.');
        } catch (error) {
            showMessage('오류', '항목 삭제에 실패했습니다.');
            console.error(error);
        }
    }

    function populateFilterCategories() {
        const select = document.getElementById('filterCategory');
        const categories = new Set();
        for (const month in expenses) {
            expenses[month].forEach(exp => {
                if (exp.type === 'expense') categories.add(exp.category);
            });
        }
        select.innerHTML = '<option value="">전체</option>';
        Array.from(categories).sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            select.appendChild(option);
        });
    }

    function showMonthlyExpenses(monthKey = getMonthKey(getLocalDate())) {
        const tableBody = document.getElementById('monthlyTableBody');
        tableBody.innerHTML = '';
        document.getElementById('currentMonthDisplay').textContent = monthKey;
        const monthlyExpenses = (expenses[monthKey] || []).sort((a, b) => new Date(a.date) - new Date(b.date));
        monthlyExpenses.forEach(exp => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.date}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.type === 'income' ? '수입' : '지출'}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.description}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.category}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">$${exp.amount.toFixed(2)}</td>
                <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.card}</td>
            `;
        });
    }

    function plotChart() {
        if (mainChart) mainChart.destroy();

        const month = document.getElementById('vizMonth').value || getMonthKey(getLocalDate());
        const type = document.getElementById('vizType').value;
        const dataForMonth = expenses[month] || [];

        const categorySums = {};
        dataForMonth.forEach(exp => {
            if (exp.type === 'expense') {
                categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
            }
        });

        const labels = Object.keys(categorySums);
        const values = Object.values(categorySums);
        const total = values.reduce((sum, val) => sum + val, 0);

        const ctx = document.getElementById('vizChart').getContext('2d');
        const config = {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: '지출',
                    data: values,
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56', '#4CAF50'],
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
                                const label = context.label || '';
                                const value = context.parsed;
                                const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: type === 'pie' ? {} : { y: { beginAtZero: true } }
            }
        };

        if (type === 'line' || type === 'bar') {
             const dailySums = {};
             dataForMonth.forEach(exp => {
                 const day = exp.date;
                 if (exp.type === 'expense') {
                      dailySums[day] = (dailySums[day] || 0) + exp.amount;
                 }
             });
             const sortedDays = Object.keys(dailySums).sort();
             const dailyValues = sortedDays.map(day => dailySums[day]);
             config.data = {
                 labels: sortedDays,
                 datasets: [{
                     label: '일별 지출',
                     data: dailyValues,
                     borderColor: '#4A90E2',
                     backgroundColor: 'rgba(74, 144, 226, 0.5)',
                     tension: 0.4,
                 }]
             };
         }
        mainChart = new Chart(ctx, config);
    }

    function compareExpenses() {
        const month1 = document.getElementById('compareMonth1').value;
        const month2 = document.getElementById('compareMonth2').value;
        const resultsDiv = document.getElementById('compareResults');
        resultsDiv.innerHTML = '';

        if (!month1 || !month2) {
            resultsDiv.innerHTML = '<p class="text-muted">비교할 두 달을 선택하세요.</p>';
            return;
        }

        const expenses1 = expenses[month1] || [];
        const expenses2 = expenses[month2] || [];

        const categorySums1 = {};
        expenses1.forEach(exp => {
            if (exp.type === 'expense') categorySums1[exp.category] = (categorySums1[exp.category] || 0) + exp.amount;
        });

        const categorySums2 = {};
        expenses2.forEach(exp => {
            if (exp.type === 'expense') categorySums2[exp.category] = (categorySums2[exp.category] || 0) + exp.amount;
        });

        const allCategories = [...new Set([...Object.keys(categorySums1), ...Object.keys(categorySums2)])];
        allCategories.forEach(category => {
            const sum1 = categorySums1[category] || 0;
            const sum2 = categorySums2[category] || 0;
            const difference = sum2 - sum1;
            const diffClass = difference > 0 ? 'text-danger' : 'text-success';
            const diffSign = difference > 0 ? '+' : '';
            resultsDiv.innerHTML += `<p><strong>${category}:</strong> $${sum1.toFixed(2)} vs $${sum2.toFixed(2)} (<span class="${diffClass}">${diffSign}$${difference.toFixed(2)}</span>)</p>`;
        });
    }

    async function exportMonth() {
        const month = document.getElementById('exportMonth').value;
        const dataForMonth = expenses[month] || [];
        if (dataForMonth.length === 0) {
            showMessage('알림', '선택한 월에 내보낼 데이터가 없습니다.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "날짜,구분,내용,카테고리,금액,결제수단\n";

        dataForMonth.forEach(exp => {
            const row = [exp.date, exp.type === 'income' ? '수입' : '지출', exp.description, exp.category, exp.amount, exp.card].map(e => `"${e}"`).join(',');
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `가계부_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.setBudget = async () => {
        const category = document.getElementById('budgetCategory').value.trim();
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        if (!category || isNaN(amount) || amount <= 0) {
            showMessage('오류', '유효한 카테고리와 금액을 입력하세요.');
            return;
        }
        try {
            const appId = "accountbook-7bc8e";
            const budgetRef = doc(db, 'artifacts', appId, 'users', userId, 'budgets', category);
            await setDoc(budgetRef, { category, amount });
            document.getElementById('budgetCategory').value = '';
            document.getElementById('budgetAmount').value = '';
            showMessage('성공', `예산이 성공적으로 설정되었습니다.`);
        } catch (error) {
            console.error("Error setting budget:", error);
            showMessage('오류', '예산 설정에 실패했습니다.');
        }
    }

    window.deleteBudget = async (category) => {
        if (!confirm(`'${category}' 예산을 삭제하시겠습니까?`)) return;
        try {
            const appId = "accountbook-7bc8e";
            const budgetRef = doc(db, 'artifacts', appId, 'users', userId, 'budgets', category);
            await deleteDoc(budgetRef);
            showMessage('성공', '예산이 성공적으로 삭제되었습니다.');
        } catch (error) {
            console.error("Error deleting budget:", error);
            showMessage('오류', '예산 삭제에 실패했습니다.');
        }
    }

    function renderBudgetList() {
        const listDiv = document.getElementById('budget-list');
        listDiv.innerHTML = '';
        if (Object.keys(budgets).length === 0) {
            listDiv.innerHTML = '<p class="text-muted">설정된 예산이 없습니다.</p>';
            return;
        }
        for (const category in budgets) {
            const budgetItem = document.createElement('div');
            budgetItem.className = 'd-flex justify-content-between align-items-center bg-light p-2 rounded mb-2';
            budgetItem.innerHTML = `
                <span><strong>${category}</strong>: $${budgets[category].toFixed(2)}</span>
                <button class="btn btn-sm btn-danger" onclick="deleteBudget('${category}')">삭제</button>
            `;
            listDiv.appendChild(budgetItem);
        }
    }

    function checkBudgets() {
        const now = new Date();
        const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const expensesThisMonth = expenses[thisMonthKey] || [];
        const alertsDiv = document.getElementById('budget-alerts');
        alertsDiv.innerHTML = '';
        let hasAlerts = false;

        const categorySums = {};
        expensesThisMonth.forEach(exp => {
            if (exp.type === 'expense') {
                categorySums[exp.category] = (categorySums[exp.category] || 0) + exp.amount;
            }
        });

        for (const category in budgets) {
            const totalSpent = categorySums[category] || 0;
            const budgetAmount = budgets[category];
            if (totalSpent > budgetAmount) {
                const alertItem = document.createElement('div');
                alertItem.className = 'alert alert-warning p-2 mb-2 d-flex align-items-center';
                alertItem.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>
                                       <div>
                                           <p class="mb-0"><strong>${category}</strong> 예산을 초과했습니다!</p>
                                           <small class="text-muted">지출: $${totalSpent.toFixed(2)} / 예산: $${budgetAmount.toFixed(2)}</small>
                                       </div>`;
                alertsDiv.appendChild(alertItem);
                hasAlerts = true;
            }
        }
        if (!hasAlerts) {
            alertsDiv.innerHTML = '<p class="text-muted">예산 초과 내역이 없습니다.</p>';
        }
    }

    // Expose functions to the global scope for HTML attributes
    window.openEditModal = openEditModal;
    window.saveEdit = saveEdit;
    window.deleteExpense = deleteExpense;
    window.refreshTable = refreshTable;
    window.plotChart = plotChart;
    window.exportMonth = exportMonth;
    // window.setBudget is already exposed
    // window.deleteBudget is already exposed
    window.checkBudgets = checkBudgets;
    window.showMonthlyExpenses = showMonthlyExpenses;
    window.compareExpenses = compareExpenses;
    window.addExpense = addExpense;

    // --- App Initialization ---
    // The `initFirebase()` function is no longer needed because Firebase is initialized at the top.
    setupNavigation();
});