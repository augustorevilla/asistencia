// app.js

// State
let currentGroup = null;
let currentView = 'home'; // home, group-details, attendance, stats

// DOM Elements
const app = document.getElementById('app');
const mainContent = document.getElementById('main-content');
const mainNav = document.getElementById('main-nav');
const fab = document.getElementById('fab');
const modal = document.createElement('div'); // Simple modal placeholder

// Init
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await db.open();
        renderHome();
    } catch (e) {
        console.error('DB Init failed', e);
        showToast('Error inicializando base de datos', 'error');
    }
});

// Routing / Navigation
function navigateTo(view, data = null) {
    currentView = view;
    mainContent.innerHTML = ''; // Clear

    switch (view) {
        case 'home':
            currentGroup = null;
            renderHome();
            break;
        case 'group-details':
            currentGroup = data;
            renderGroupDetails(data);
            break;
        case 'attendance':
            renderAttendanceView(data); // data is group
            break;
        case 'stats':
            renderStatsView(data); // data is group
            break;
        case 'attendance-details':
            renderAttendanceDetails(data); // data is attendance record
            break;
    }
}

// Views
async function renderHome() {
    mainContent.innerHTML = '<h2>Mis Grupos</h2><div id="groups-list"></div>';

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.textContent = 'Autor Augusto Revilla';
    mainContent.appendChild(footer);

    fab.style.display = 'flex';
    fab.onclick = showAddGroupModal;

    // Export All Button
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-primary';
    exportBtn.style.width = '100%';
    exportBtn.style.marginBottom = '16px';
    exportBtn.textContent = 'Exportar Todo a Excel';
    exportBtn.onclick = exportAllData;

    // Insert before groups list
    mainContent.insertBefore(exportBtn, document.getElementById('groups-list'));

    const groups = await db.getGroups();
    const list = document.getElementById('groups-list');

    if (groups.length === 0) {
        list.innerHTML = '<div class="empty-state">No tienes grupos. Crea uno con el botón +.</div>';
    } else {
        for (const group of groups) {
            const card = document.createElement('div');
            card.className = 'card';

            // Group Header
            const header = document.createElement('div');
            header.innerHTML = `<h3>${group.name}</h3><p>Toque para ver detalles</p>`;
            header.onclick = () => navigateTo('group-details', group);
            card.appendChild(header);

            // Recent Records for this group
            const allAttendance = await db.getAllAttendance(group.id);
            if (allAttendance.length > 0) {
                // Sort desc
                allAttendance.sort((a, b) => b.date.localeCompare(a.date));
                const recent = allAttendance.slice(0, 3); // Top 3

                const recentContainer = document.createElement('div');
                recentContainer.style.marginTop = '12px';
                recentContainer.style.borderTop = '1px solid #eee';
                recentContainer.style.paddingTop = '8px';
                recentContainer.innerHTML = '<small style="color:var(--text-secondary); display:block; margin-bottom:4px">Últimos registros:</small>';

                recent.forEach(record => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.marginBottom = '4px';
                    row.style.fontSize = '0.9rem';

                    row.innerHTML = `
                        <span>${record.date}</span>
                        <button class="btn btn-text btn-sm" style="padding:4px 8px">Ver</button>
                    `;
                    row.querySelector('button').onclick = (e) => {
                        e.stopPropagation();
                        navigateTo('attendance-details', record);
                    };
                    recentContainer.appendChild(row);
                });
                card.appendChild(recentContainer);
            }

            list.appendChild(card);
        }
    }
}

async function exportAllData() {
    const groups = await db.getGroups();
    if (groups.length === 0) {
        showToast('No hay datos para exportar', 'error');
        return;
    }

    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <!--[if gte mso 9]>
            <xml>
                <x:ExcelWorkbook>
                    <x:ExcelWorksheets>
                        <x:ExcelWorksheet>
                            <x:Name>Asistencia Completa</x:Name>
                            <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                            </x:WorksheetOptions>
                        </x:ExcelWorksheet>
                    </x:ExcelWorksheets>
                </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                th, td { border: 1px solid #000; padding: 5px; text-align: center; }
                th { background-color: #f0f0f0; }
                h2 { color: #333; }
            </style>
        </head>
        <body>
    `;

    for (const group of groups) {
        const members = await db.getMembers(group.id);
        const allAttendance = await db.getAllAttendance(group.id);

        // Sort attendance by date
        allAttendance.sort((a, b) => a.date.localeCompare(b.date));

        html += `<h2>Grupo: ${group.name}</h2>`;
        html += `<table>`;

        // Header Row
        html += `<tr><th>Miembro / Fecha</th>`;
        allAttendance.forEach(record => {
            html += `<th>${record.date}</th>`;
        });
        html += `</tr>`;

        // Data Rows
        if (members.length > 0) {
            members.forEach(member => {
                html += `<tr><td style="text-align:left">${member.name}</td>`;
                allAttendance.forEach(record => {
                    const r = record.records.find(x => x.memberId === member.id);
                    const status = r ? (r.present ? 'P' : 'F') : '-';
                    const color = r ? (r.present ? '#ccffcc' : '#ffcccc') : '#ffffff';
                    html += `<td style="background-color:${color}">${status}</td>`;
                });
                html += `</tr>`;
            });
        } else {
            html += `<tr><td colspan="${allAttendance.length + 1}">No hay miembros</td></tr>`;
        }

        html += `</table><br/>`;
    }

    html += `</body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Asistencia_Completa_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
}

async function renderGroupDetails(group) {
    mainContent.innerHTML = `
        <div class="card">
            <h2>${group.name}</h2>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button id="btn-attendance" class="btn btn-primary">Tomar Asistencia</button>
                <button id="btn-stats" class="btn btn-text">Estadísticas</button>
            </div>
            <div style="margin-top:10px;">
                <button id="btn-delete-group" class="btn btn-text" style="color:var(--error-color)">Eliminar Grupo</button>
                <button id="btn-back-home" class="btn btn-text" style="width:100%; margin-top:10px">Volver</button>
            </div>
        </div>
        <h3>Miembros</h3>
        <div id="members-list"></div>
    `;

    fab.style.display = 'flex';
    fab.onclick = () => showAddMemberModal(group);

    document.getElementById('btn-attendance').onclick = () => navigateTo('attendance', group);
    document.getElementById('btn-stats').onclick = () => navigateTo('stats', group);
    document.getElementById('btn-delete-group').onclick = () => deleteGroup(group);
    document.getElementById('btn-back-home').onclick = () => navigateTo('home');

    const members = await db.getMembers(group.id);
    const list = document.getElementById('members-list');

    if (members.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay miembros. Agrega uno con el botón +.</div>';
        return;
    }

    members.forEach(member => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <span>${member.name}</span>
            <div>
                <button class="btn btn-text" title="Editar">✏️</button>
                <button class="btn btn-text" title="Eliminar" style="color:var(--error-color)">🗑️</button>
            </div>
        `;

        const buttons = item.querySelectorAll('button');
        buttons[0].onclick = () => editMember(member);
        buttons[1].onclick = () => deleteMember(member.id);

        list.appendChild(item);
    });
}

async function renderAttendanceView(group) {
    const today = new Date().toISOString().split('T')[0];

    mainContent.innerHTML = `
        <h2>Asistencia: ${group.name}</h2>
        <div class="form-group">
            <label>Fecha</label>
            <input type="date" id="attendance-date" value="${today}">
        </div>
        <div id="attendance-list" class="card"></div>
        <button id="btn-save" class="btn btn-primary" style="width:100%">Guardar Asistencia</button>
        <button id="btn-back" class="btn btn-text" style="width:100%; margin-top:8px">Volver</button>
    `;

    fab.style.display = 'none';

    document.getElementById('btn-back').onclick = () => navigateTo('group-details', group);

    const dateInput = document.getElementById('attendance-date');
    const listContainer = document.getElementById('attendance-list');
    const members = await db.getMembers(group.id);

    // State for this view
    let attendanceState = {}; // memberId -> boolean (true=present, false=absent)

    // Initialize default (present)
    members.forEach(m => attendanceState[m.id] = true);

    const loadAttendance = async (date) => {
        const record = await db.getAttendance(group.id, date);
        if (record) {
            // Reset first
            members.forEach(m => attendanceState[m.id] = false); // Default absent if record exists? Or just load from record
            // Actually better to map record to state
            record.records.forEach(r => {
                attendanceState[r.memberId] = r.present;
            });
        } else {
            // Default all present for new day
            members.forEach(m => attendanceState[m.id] = true);
        }
        renderList();
    };

    const renderList = () => {
        listContainer.innerHTML = '';
        if (members.length === 0) {
            listContainer.innerHTML = '<p>No hay miembros en este grupo.</p>';
            return;
        }

        members.forEach(member => {
            const row = document.createElement('div');
            row.className = 'list-item';
            const isPresent = attendanceState[member.id];

            row.innerHTML = `
                <span>${member.name}</span>
                <div class="attendance-toggle ${isPresent ? 'present' : 'absent'}" 
                     role="button" tabindex="0">
                    ${isPresent ? 'P' : 'A'}
                </div>
            `;

            row.querySelector('.attendance-toggle').onclick = () => {
                attendanceState[member.id] = !attendanceState[member.id];
                renderList();
            };

            listContainer.appendChild(row);
        });
    };

    dateInput.onchange = (e) => loadAttendance(e.target.value);

    document.getElementById('btn-save').onclick = async () => {
        const records = Object.keys(attendanceState).map(id => ({
            memberId: parseInt(id),
            present: attendanceState[id]
        }));

        try {
            await db.saveAttendance(group.id, dateInput.value, records);
            showToast('Asistencia guardada');
            navigateTo('group-details', group); // Go back or stay? Go back feels right.
        } catch (e) {
            console.error(e);
            showToast('Error al guardar', 'error');
        }
    };

    // Initial load
    await loadAttendance(today);
}

async function renderStatsView(group) {
    mainContent.innerHTML = `
        <h2>Estadísticas: ${group.name}</h2>
        <div class="card" id="stats-container">
            Cargando...
        </div>
        <button id="btn-export" class="btn btn-primary" style="width:100%; margin-bottom:8px">Exportar a Excel (CSV)</button>
        <button id="btn-back" class="btn btn-text" style="width:100%">Volver</button>
    `;
    fab.style.display = 'none';

    document.getElementById('btn-back').onclick = () => navigateTo('group-details', group);
    document.getElementById('btn-export').onclick = () => exportToCSV(group);

    const members = await db.getMembers(group.id);
    const allAttendance = await db.getAllAttendance(group.id);

    if (allAttendance.length === 0) {
        document.getElementById('stats-container').innerHTML = 'No hay datos de asistencia aún.';
        return;
    }

    // Calculate stats
    const stats = {}; // memberId -> { present: 0, total: 0 }
    members.forEach(m => stats[m.id] = { present: 0, total: 0, name: m.name });

    allAttendance.forEach(record => {
        record.records.forEach(r => {
            if (stats[r.memberId]) {
                stats[r.memberId].total++;
                if (r.present) stats[r.memberId].present++;
            }
        });
    });

    const container = document.getElementById('stats-container');
    container.innerHTML = '';

    members.forEach(m => {
        const s = stats[m.id];
        const percent = s.total === 0 ? 0 : Math.round((s.present / s.total) * 100);

        const row = document.createElement('div');
        row.style.marginBottom = '10px';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span>${m.name}</span>
                <span>${percent}%</span>
            </div>
            <div style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--primary-color); width:${percent}%; height:100%"></div>
            </div>
        `;
        container.appendChild(row);
    });
}

async function renderAttendanceDetails(record) {
    const group = await db.getGroup(record.groupId);
    const groupName = group ? group.name : 'Grupo desconocido';

    mainContent.innerHTML = `
        <h2>Detalle de Asistencia</h2>
        <div class="card">
            <h3>${groupName}</h3>
            <p>Fecha: ${record.date}</p>
        </div>
        <h3>Integrantes</h3>
        <div id="details-list" class="card"></div>
        <button id="btn-back" class="btn btn-text" style="width:100%; margin-top:10px">Volver</button>
    `;

    fab.style.display = 'none';
    document.getElementById('btn-back').onclick = () => navigateTo('home');

    const list = document.getElementById('details-list');
    const members = await db.getMembers(record.groupId);

    // Map member names
    const memberMap = {};
    members.forEach(m => memberMap[m.id] = m.name);

    if (record.records.length === 0) {
        list.innerHTML = '<p>No hay registros.</p>';
        return;
    }

    record.records.forEach(r => {
        const row = document.createElement('div');
        row.className = 'list-item';
        const name = memberMap[r.memberId] || 'Miembro desconocido';
        const status = r.present ? 'Presente' : 'Falta';
        const color = r.present ? 'var(--success-color, green)' : 'var(--error-color, red)'; // Assuming vars

        row.innerHTML = `
            <span>${name}</span>
            <span style="font-weight:bold; color:${color}">${status}</span>
        `;
        list.appendChild(row);
    });
}

// Logic Actions
async function showAddGroupModal() {
    const name = prompt('Nombre del Grupo:');
    if (name) {
        await db.addGroup(name);
        renderHome();
    }
}

async function showAddMemberModal(group) {
    const name = prompt('Nombre del Miembro:');
    if (name) {
        await db.addMember(group.id, name);
        renderGroupDetails(group);
    }
}

async function deleteMember(id) {
    if (confirm('¿Eliminar miembro?')) {
        await db.deleteMember(id);
        // Refresh
        const m = await db.getMembers(currentGroup.id); // check if re-fetch needed
        renderGroupDetails(currentGroup);
    }
}

async function deleteGroup(group) {
    if (confirm(`¿Eliminar grupo ${group.name} y todos sus datos permanently?`)) {
        await db.deleteGroup(group.id);
        // Should also delete members and attendance for that group conceptually
        // For now just delete group shell
        navigateTo('home');
    }
}

function exportToCSV(group) {
    db.getAllAttendance(group.id).then(async (allAttendance) => {
        const members = await db.getMembers(group.id);

        // Pivot data: Date | Member1 | Member2 ...
        // Header
        let csv = 'Fecha,' + members.map(m => m.name).join(',') + '\n';

        // Sort by date
        allAttendance.sort((a, b) => a.date.localeCompare(b.date));

        allAttendance.forEach(record => {
            let row = `${record.date}`;
            members.forEach(m => {
                const r = record.records.find(x => x.memberId === m.id);
                const status = r ? (r.present ? 'P' : 'A') : '-';
                row += `,${status}`;
            });
            csv += row + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Asistencia_${group.name}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    });
}

function showToast(msg, type = 'info') {
    const t = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '24px';
    toast.style.zIndex = '100';
    if (type === 'error') toast.style.background = '#b00020';

    setTimeout(() => t.removeChild(toast), 3000);
}

async function editMember(member) {
    const newName = prompt('Nuevo nombre:', member.name);
    if (newName && newName !== member.name) {
        member.name = newName;
        try {
            await db.updateMember(member);
            renderGroupDetails(currentGroup);
            showToast('Miembro actualizado');
        } catch (e) {
            console.error(e);
            showToast('Error al actualizar', 'error');
        }
    }
}
