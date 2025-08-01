
// --- 全局变量和常量 ---
let projects = []; // 所有项目的数据
let filteredProjects = []; // 经过筛选后显示在表格中的数据
let editingIndex = -1; // 正在编辑的项目的索引
let activeCardFilter = 'total';
const STORAGE_KEY = 'projectDeliveryData';

let issueTypeChart = null;

const ASSET_TYPE_MAP = { 'app': 'APP', 'miniprogram': '小程序', 'wechat': '公众号', 'h5': 'H5' };
const STATUS_MAP = { 'initial-test': '初测', 're-test': '复测' };

// --- 初始化 ---
function initApp() {
    if (!loadFromLocalStorage() || projects.length === 0) {
        // 如果没有本地数据，使用示例数据
        projects = [
            { name: "电商移动端APP", assetType: "app", status: "re-test", deliveryDate: "2024-03-10", privacyIssues: 2, securityIssues: 1, remarks: "已完成一轮复测" },
            { name: "客服小程序", assetType: "miniprogram", status: "initial-test", deliveryDate: "2024-04-15", privacyIssues: 0, securityIssues: 3, remarks: "安全问题待修复" },
            { name: "营销H5", assetType: "h5", status: "re-test", deliveryDate: "2024-02-25", privacyIssues: 1, securityIssues: 0, remarks: "" },
            { name: "企业公众号", assetType: "wechat", status: "initial-test", deliveryDate: "2024-05-20", privacyIssues: 0, securityIssues: 0, remarks: "待开始初测" }
        ];
        saveToLocalStorage();
    }
    setInitialMonth();
    setupEventListeners();
    applyFilters();
}

// --- 数据持久化 ---
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error('保存数据失败:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            projects = JSON.parse(saved).map(p => ({ ...p, privacyIssues: p.privacyIssues || 0, securityIssues: p.securityIssues || 0 }));
            sortProjects(); // Sort after loading
            return true;
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
    return false;
}

// --- 事件与筛选 ---
function setupEventListeners() {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            document.getElementById('monthFilter').value = '';
            setActiveCardFilter(card.dataset.filter);
        });
    });
    document.getElementById('clear-card-filter').addEventListener('click', () => setActiveCardFilter('total'));
}

function setInitialMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('monthFilter').value = `${year}-${month}`;
}

function applyFilters() {
    const monthFilter = document.getElementById('monthFilter').value;
    let tempProjects = [...projects];

    if (monthFilter) {
        tempProjects = tempProjects.filter(p => p.deliveryDate && p.deliveryDate.startsWith(monthFilter));
        if (activeCardFilter !== 'total') setActiveCardFilter('total', false);
    }

    switch (activeCardFilter) {
        case 're-test': filteredProjects = tempProjects.filter(p => p.status === 're-test'); break;
        case 'privacy': filteredProjects = tempProjects.filter(p => p.privacyIssues > 0); break;
        case 'security': filteredProjects = tempProjects.filter(p => p.securityIssues > 0); break;
        default: filteredProjects = [...tempProjects]; break;
    }
    renderAllUI();
}

function setActiveCardFilter(filterType, doApplyFilters = true) {
    activeCardFilter = filterType;
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${filterType}`).classList.add('active');
    const filterStatusEl = document.getElementById('filter-status');
    if (filterType === 'total') {
        filterStatusEl.style.display = 'none';
    } else {
        const label = document.querySelector(`#card-${filterType} .stat-label`).textContent;
        document.getElementById('filter-text').textContent = `筛选: ${label}`;
        filterStatusEl.style.display = 'inline-flex';
    }
    if (doApplyFilters) applyFilters();
}

function filterByMonth() { applyFilters(); }
function clearFilter() {
    document.getElementById('monthFilter').value = '';
    setActiveCardFilter('total');
}

// --- UI 渲染 ---
function renderAllUI() {
    renderTable();
    updateStats();
    renderCharts();
    feather.replace();
}

function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';
    filteredProjects.forEach((project, index) => {
        const row = document.createElement('tr');
        const isHighlighted = (activeCardFilter === 'privacy' && project.privacyIssues > 0) || (activeCardFilter === 'security' && project.securityIssues > 0);
        row.className = isHighlighted ? 'highlight' : '';
        row.innerHTML = `
            <td class="project-name">${project.name}</td>
            <td><span class="asset-type asset-${project.assetType}">${ASSET_TYPE_MAP[project.assetType]}</span></td>
            <td><span class="status status-${project.status}">${STATUS_MAP[project.status]}</span></td>
            <td>${project.deliveryDate || '-'}</td>
            <td><span class="issue-count issue-privacy">${project.privacyIssues}</span></td>
            <td><span class="issue-count issue-security">${project.securityIssues}</span></td>
            <td class="remarks" title="${project.remarks}">${project.remarks || '-'}</td>
            <td class="actions">
                <button class="btn-icon" onclick="showEditModal(${index})" title="编辑"><i data-feather="edit"></i></button>
                <button class="btn-icon" onclick="deleteProject(${index})" title="删除"><i data-feather="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateStats() {
    document.getElementById('totalProjects').textContent = projects.length;
    document.getElementById('reTestProjects').textContent = projects.filter(p => p.status === 're-test').length;
    document.getElementById('totalPrivacyIssues').textContent = projects.reduce((sum, p) => sum + p.privacyIssues, 0);
    document.getElementById('totalSecurityIssues').textContent = projects.reduce((sum, p) => sum + p.securityIssues, 0);
    document.querySelector('#card-total .stat-icon').innerHTML = '<i data-feather="bar-chart-2"></i>';
    document.querySelector('#card-re-test .stat-icon').innerHTML = '<i data-feather="check-circle"></i>';
    document.querySelector('#card-privacy .stat-icon').innerHTML = '<i data-feather="shield"></i>';
    document.querySelector('#card-security .stat-icon').innerHTML = '<i data-feather="alert-triangle"></i>';
}

function renderCharts() {
    renderIssueTypeChart();
    renderMonthlyDeliveryReport();
}

function renderIssueTypeChart() {
    const ctx = document.getElementById('issueTypeChart').getContext('2d');
    const labels = Object.values(ASSET_TYPE_MAP);
    const keys = Object.keys(ASSET_TYPE_MAP);
    const privacyData = keys.map(key => projects.reduce((sum, p) => sum + (p.assetType === key ? p.privacyIssues : 0), 0));
    const securityData = keys.map(key => projects.reduce((sum, p) => sum + (p.assetType === key ? p.securityIssues : 0), 0));
    if (issueTypeChart) issueTypeChart.destroy();
    issueTypeChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: '隐私合规问题', data: privacyData, backgroundColor: '#FBBF24' }, { label: '安全漏洞问题', data: securityData, backgroundColor: '#F87171' }] }, options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}

function renderMonthlyDeliveryReport() {
    const container = document.getElementById('monthlyDeliveryReport');
    const monthFilter = document.getElementById('monthFilter').value;
    if (!monthFilter) {
        container.innerHTML = '<p style="color: #9CA3AF;">请选择一个月份以查看报告。</p>';
        return;
    }
    const projectsInMonth = projects.filter(p => p.deliveryDate && p.deliveryDate.startsWith(monthFilter));
    const [year, month] = monthFilter.split('-');
    let html = '';
    for (const [key, name] of Object.entries(ASSET_TYPE_MAP)) {
        const assetProjects = projectsInMonth.filter(p => p.assetType === key);
        const counts = assetProjects.reduce((acc, p) => ({ ...acc, [p.name]: (acc[p.name] || 0) + 1 }), {});
        html += `<div class="report-item"><div class="report-item-header">${year}年${month}月 ${name}交付情况 (${assetProjects.length} 次)：</div><div class="report-item-details">${Object.entries(counts).map(([projName, count]) => `<span>${projName}(${count}次)</span>`).join('') || '无'}</div></div>`;
    }
    container.innerHTML = html;
}

// --- 模态框与表单 ---
function sortProjects() {
    projects.sort((a, b) => {
        if (!a.deliveryDate) return 1; // a goes to the end
        if (!b.deliveryDate) return -1; // b goes to the end
        return a.deliveryDate.localeCompare(b.deliveryDate); // oldest date first
    });
}

function showAddModal() {
    editingIndex = -1;
    document.getElementById('modalTitle').textContent = '添加新项目';
    clearForm();
    document.getElementById('projectModal').style.display = 'block';
    feather.replace();
}

function showEditModal(index) {
    editingIndex = projects.findIndex(p => p === filteredProjects[index]);
    const project = projects[editingIndex];
    document.getElementById('modalTitle').textContent = '编辑项目';
    document.getElementById('projectName').value = project.name;
    document.getElementById('assetType').value = project.assetType;
    document.getElementById('deliveryStatus').value = project.status;
    document.getElementById('deliveryDate').value = project.deliveryDate;
    document.getElementById('formPrivacyIssues').value = project.privacyIssues;
    document.getElementById('formSecurityIssues').value = project.securityIssues;
    document.getElementById('remarks').value = project.remarks;
    document.getElementById('projectModal').style.display = 'block';
    feather.replace();
}

function saveProject() {
    const project = {
        name: document.getElementById('projectName').value.trim(),
        assetType: document.getElementById('assetType').value,
        status: document.getElementById('deliveryStatus').value,
        deliveryDate: document.getElementById('deliveryDate').value,
        privacyIssues: parseInt(document.getElementById('formPrivacyIssues').value, 10) || 0,
        securityIssues: parseInt(document.getElementById('formSecurityIssues').value, 10) || 0,
        remarks: document.getElementById('remarks').value.trim(),
    };
    if (!project.name) { alert('请输入项目名称'); return; }
    if (editingIndex >= 0) {
        projects[editingIndex] = project;
    } else {
        projects.push(project);
    }
    sortProjects(); // Sort after modification
    saveToLocalStorage();
    applyFilters();
    closeModal();
}

function deleteProject(index) {
    if (confirm('确定要删除这个项目吗？')) {
        const projectToDelete = filteredProjects[index];
        projects = projects.filter(p => p !== projectToDelete);
        saveToLocalStorage();
        applyFilters();
    }
}

function clearForm() {
    document.getElementById('projectName').value = '';
    document.getElementById('assetType').value = 'app';
    document.getElementById('deliveryStatus').value = 'initial-test';
    document.getElementById('deliveryDate').value = '';
    document.getElementById('formPrivacyIssues').value = 0;
    document.getElementById('formSecurityIssues').value = 0;
    document.getElementById('remarks').value = '';
}

function closeModal() {
    document.getElementById('projectModal').style.display = 'none';
}

// --- 导入/导出 ---

function exportToExcel() {
    const dataToExport = filteredProjects.length > 0 ? filteredProjects : projects;
    if (dataToExport.length === 0) {
        alert('没有数据可以导出。');
        return;
    }

    const mappedData = dataToExport.map(p => ({
        '项目名称': p.name,
        '资产类型': ASSET_TYPE_MAP[p.assetType] || p.assetType,
        '交付状态': STATUS_MAP[p.status] || p.status,
        '交付时间': p.deliveryDate,
        '隐私合规问题': p.privacyIssues,
        '安全漏洞问题': p.securityIssues,
        '备注': p.remarks
    }));

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '项目交付记录');

    // 设置列宽
    ws['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, 
        { wch: 18 }, { wch: 18 }, { wch: 30 }
    ];

    const filename = `项目交付记录_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (Array.isArray(importedData)) {
                    if (confirm(`确定要导入 ${importedData.length} 条JSON记录吗？这将替换当前所有数据。`)) {
                        projects = importedData;
                        sortProjects(); // Sort after import
                        saveToLocalStorage();
                        clearFilter();
                        alert('JSON数据导入成功！');
                    }
                } else {
                    alert('导入失败：JSON文件格式不正确。');
                }
            } catch (error) {
                alert(`导入失败：${error.message}`);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function importExcel() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx, .xls';
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    alert('Excel文件中没有找到数据。');
                    return;
                }

                if (confirm(`确定要导入 ${jsonData.length} 条Excel记录吗？这将替换当前所有数据。`)) {
                    const reverseAssetMap = Object.fromEntries(Object.entries(ASSET_TYPE_MAP).map(([k, v]) => [v, k]));
                    const reverseStatusMap = Object.fromEntries(Object.entries(STATUS_MAP).map(([k, v]) => [v, k]));

                    projects = jsonData.map(row => ({
                        name: row['项目名称'] || '',
                        assetType: reverseAssetMap[row['资产类型']] || 'app',
                        status: reverseStatusMap[row['交付状态']] || 'initial-test',
                        deliveryDate: formatExcelDate(row['交付时间']),
                        privacyIssues: parseInt(row['隐私合规问题'], 10) || 0,
                        securityIssues: parseInt(row['安全漏洞问题'], 10) || 0,
                        remarks: row['备注'] || ''
                    }));
                    sortProjects(); // Sort after import
                    saveToLocalStorage();
                    clearFilter();
                    alert('Excel数据导入成功！');
                }
            } catch (error) {
                alert(`导入失败：${error.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };
    fileInput.click();
}

function formatExcelDate(excelDate) {
    if (!excelDate) return '';
    if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
        return excelDate;
    }
    if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    return '';
}

function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        projects = [];
        saveToLocalStorage();
        applyFilters();
    }
}


// --- 辅助函数 ---
function getIssueClass(count) {
    if (count === 0) return 'issue-low';
    if (count <= 2) return 'issue-medium';
    return 'issue-high';
}

// --- 启动 ---
document.addEventListener('DOMContentLoaded', initApp);
