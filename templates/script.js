// Korean Personal Finance App (가계부) - Pure JavaScript
// In-memory data storage (replacing Firebase for demo)
let expenses = {};
let budgets = {};
let currentUser = null;
let mainChart = null;
let dashboardChart = null;

// UI elements
const loadingSpinner = document.getElementById('loading-spinner');
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');

// Demo login function
function demoLogin() {
    currentUser = { uid: 'demo-user', email: 'demo@example.com' };
    loadingSpinner.style.display = 'none';
    loginPage.style.display = 'none';
    appContainer.style.display = 'flex';

    // Load demo data
    loadDemoData();

    // Wait for elements to be visible before rendering dashboard
    setTimeout(() => {
        renderDashboard();
        populateFilterCategories();
        renderBudgetList();
    }, 100);
}

// Load demo data
function loadDemoData() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    expenses[currentMonth] = [
        { id: '1', type: 'expense', date: `${currentMonth}-01`, description: '마트 장보기', category: '식비', amount: 50000, card: '체크카드' },
        { id: '2', type: 'expense', date: `${currentMonth}-03`, description: '카페', category: '식비', amount: 8000, card: '현금' },
        { id: '3', type: 'income', date: `${currentMonth}-01`, description: '월급', category: '급여', amount: 3000000, card: '계좌이체' },
        { id: '4', type: 'expense', date: `${currentMonth}-05`, description: '지하철', category: '교통', amount: 2500, card: '교통카드' },
        { id: '5', type: 'expense', date: `${currentMonth}-07`, description: '영화', category: '문화', amount: 15000, card: '신용카드' }
    ];

    expenses[lastMonthKey] = [
        { id: '6', type: 'expense', date: `${lastMonthKey}-15`, description: '마트 장보기', category: '식비', amount: 45000, card: '체크카드' },
        { id: '7', type: 'expense', date: `${lastMonthKey}-20`, description: '주유', category: '교통', amount: 60000, card: '신용카드' }
    ];

    budgets = {
        '식비': 100000,
        '교통': 50000,
        '문화': 30000
    };
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
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function showMessage(title, body) {
    document.getElementById('messageModalTitle').textContent = title;
    document.getElementById('messageModalBody').innerHTML = body;
    new bootstrap.Modal(document.getElementById('messageModal')).show();
}

// Dashboard rendering
function renderDashboard() {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const expensesThisMonth = expenses[thisMonthKey] || [];
    const expensesLastMonth = expenses[lastMonthKey] || [];

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

    document.getElementById('dashboard-income').textContent = formatCurrency(incomeThisMonth);
    document.getElementById('dashboard-expense').textContent = formatCurrency(expenseThisMonth);
    document.getElementById('dashboard-prev-expense').textContent = formatCurrency(expenseLastMonth);
    document.getElementById('dashboard-net-income').textContent = formatCurrency(incomeThisMonth - expenseThisMonth);

    // Only plot chart if we have a canvas element
    const chartElement = document.getElementById('dashboardChart');
    if (chartElement) {
        plotDashboardChart(expensesThisMonth);
    }

    checkBudgets();
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
        // Continue without chart if there's an error
    }
}

// Data management functions
function addExpense(e) {
    e.preventDefault();
    const newExpense = {
        id: Date.now().toString(),
        type: document.getElementById('type').value,
        date: document.getElementById('date').value || getLocalDate(),
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        amount: parseInt(document.getElementById('amount').value),
        card: document.getElementById('card').value || '현금',
        timestamp: new Date().toISOString()
    };

    const monthKey = getMonthKey(newExpense.date);
    if (!expenses[monthKey]) expenses[monthKey] = [];
    expenses[monthKey].push(newExpense);

    document.getElementById('addForm').reset();
    document.getElementById('date').value = getLocalDate();

    renderDashboard();
    refreshTable();
    populateFilterCategories();
    showMessage('성공', '항목이 성공적으로 추가되었습니다.');
}

function getFilteredExpenses() {
    let allExpenses = [];
    for (const month in expenses) {
        allExpenses = allExpenses.concat(expenses[month]);
    }

    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const filterCategory = document.getElementById('filterCategory').value;
    const descSearch = document.getElementById('descSearch').value.toLowerCase();

    return allExpenses.filter(exp => {
        const dateMatch = (!fromDate || exp.date >= fromDate) && (!toDate || exp.date <= toDate);
        const categoryMatch = (!filterCategory || exp.category === filterCategory);
        const descMatch = (!descSearch || exp.description.toLowerCase().includes(descSearch));
        return dateMatch && categoryMatch && descMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function refreshTable() {
    const tableBody = document.getElementById('expenseTable').querySelector('tbody');
    if (!tableBody) return;

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

function openEditModal(expenseId) {
    let expenseToEdit = null;
    for (const monthKey in expenses) {
        const expense = expenses[monthKey].find(e => e.id === expenseId);
        if (expense) {
            expenseToEdit = expense;
            break;
        }
    }

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

function saveEdit() {
    const expenseId = document.getElementById('edit-id').value;
    const updatedExpense = {
        id: expenseId,
        type: document.getElementById('edit-type').value,
        date: document.getElementById('edit-date').value,
        description: document.getElementById('edit-description').value,
        category: document.getElementById('edit-category').value,
        amount: parseInt(document.getElementById('edit-amount').value),
        card: document.getElementById('edit-card').value
    };

    // Find and update the expense
    for (const monthKey in expenses) {
        const index = expenses[monthKey].findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses[monthKey][index] = updatedExpense;
            break;
        }
    }

    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    renderDashboard();
    refreshTable();
    populateFilterCategories();
    showMessage('성공', '항목이 성공적으로 수정되었습니다.');
}

function deleteExpense(expenseId) {
    if (!confirm('정말로 이 항목을 삭제하시겠습니까?')) return;

    for (const monthKey in expenses) {
        const index = expenses[monthKey].findIndex(e => e.id === expenseId);
        if (index !== -1) {
            expenses[monthKey].splice(index, 1);
            break;
        }
    }

    renderDashboard();
    refreshTable();
    populateFilterCategories();
    showMessage('성공', '항목이 성공적으로 삭제되었습니다.');
}

function populateFilterCategories() {
    const select = document.getElementById('filterCategory');
    if (!select) return;

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
    if (!tableBody) return;

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
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${formatCurrency(exp.amount)}</td>
            <td class="${exp.type === 'income' ? 'text-success' : 'text-danger'}">${exp.card}</td>
        `;
    });
}

function plotChart() {
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }

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

    if (labels.length === 0) {
        labels.push('데이터 없음');
        values.push(0);
    }

    const ctx = document.getElementById('vizChart');
    if (!ctx) return;

    try {
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

function compareExpenses() {
    const month1 = document.getElementById('compareMonth1').value;
    const month2 = document.getElementById('compareMonth2').value;
    const resultsDiv = document.getElementById('compareResults');
    if (!resultsDiv) return;

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
        resultsDiv.innerHTML += `
            <p><strong>${category}:</strong> 
            ${formatCurrency(sum1)} vs ${formatCurrency(sum2)} 
            (<span class="${diffClass}">${diffSign}${formatCurrency(difference)}</span>)
            </p>`;
    });
}

function exportMonth() {
    const month = document.getElementById('exportMonth').value;
    const dataForMonth = expenses[month] || [];

    if (dataForMonth.length === 0) {
        showMessage('알림', '선택한 월에 내보낼 데이터가 없습니다.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "날짜,구분,내용,카테고리,금액,결제수단\n";

    dataForMonth.forEach(exp => {
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
}

function setBudget() {
    const category = document.getElementById('budgetCategory').value.trim();
    const amount = parseInt(document.getElementById('budgetAmount').value);

    if (!category || isNaN(amount) || amount <= 0) {
        showMessage('오류', '유효한 카테고리와 금액을 입력하세요.');
        return;
    }

    budgets[category] = amount;
    document.getElementById('budgetCategory').value = '';
    document.getElementById('budgetAmount').value = '';

    renderBudgetList();
    checkBudgets();
    showMessage('성공', '예산이 성공적으로 설정되었습니다.');
}

function deleteBudget(category) {
    if (!confirm(`'${category}' 예산을 삭제하시겠습니까?`)) return;

    delete budgets[category];
    renderBudgetList();
    checkBudgets();
    showMessage('성공', '예산이 성공적으로 삭제되었습니다.');
}

function renderBudgetList() {
    const listDiv = document.getElementById('budget-list');
    if (!listDiv) return;

    listDiv.innerHTML = '';

    if (Object.keys(budgets).length === 0) {
        listDiv.innerHTML = '<p class="text-muted">설정된 예산이 없습니다.</p>';
        return;
    }

    for (const category in budgets) {
        const budgetItem = document.createElement('div');
        budgetItem.className = 'd-flex justify-content-between align-items-center bg-light p-2 rounded mb-2';
        budgetItem.innerHTML = `
            <span><strong>${category}</strong>: ${formatCurrency(budgets[category])}</span>
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
    if (!alertsDiv) return;

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
            alertItem.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                    <p class="mb-0"><strong>${category}</strong> 예산을 초과했습니다!</p>
                    <small class="text-muted">지출: ${formatCurrency(totalSpent)} / 예산: ${formatCurrency(budgetAmount)}</small>
                </div>
            `;
            alertsDiv.appendChild(alertItem);
            hasAlerts = true;
        }
    }

    if (!hasAlerts) {
        alertsDiv.innerHTML = '<p class="text-muted">예산 초과 내역이 없습니다.</p>';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set up login
    document.getElementById('demoBtn').addEventListener('click', demoLogin);
    document.getElementById('emailSignInBtn').addEventListener('click', function() {
        showMessage('알림', '데모 버전에서는 데모 사용 버튼을 이용해 주세요.');
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            location.reload();
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

    // Show loading initially
    setTimeout(() => {
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (loginPage) loginPage.style.display = 'block';
    }, 1000);
});

// Global function exports for onclick handlers
window.openEditModal = openEditModal;
window.saveEdit = saveEdit;
window.deleteExpense = deleteExpense;
window.exportMonth = exportMonth;
window.deleteBudget = deleteBudget;