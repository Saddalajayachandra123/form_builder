let formFields = [];
let currentEditingField = null;
let formResponses = [];
let draggedElement = null;

const fieldTypes = {
    text: { icon: '📝', label: 'Text Input', hasPlaceholder: true },
    textarea: { icon: '📄', label: 'Textarea', hasPlaceholder: true },
    email: { icon: '📧', label: 'Email', hasPlaceholder: true },
    number: { icon: '🔢', label: 'Number', hasPlaceholder: true },
    password: { icon: '🔒', label: 'Password', hasPlaceholder: true },
    dropdown: { icon: '📋', label: 'Dropdown', hasOptions: true },
    radio: { icon: '⭕', label: 'Radio Buttons', hasOptions: true },
    checkbox: { icon: '☑️', label: 'Checkboxes', hasOptions: true },
    date: { icon: '📅', label: 'Date Picker', hasPlaceholder: false },
    file: { icon: '📎', label: 'File Upload', hasPlaceholder: false }
};

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadFromStorage();
    attachEventListeners();
});

function initializeApp() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function attachEventListeners() {
    document.querySelectorAll('.field-btn').forEach(btn => {
        btn.addEventListener('click', () => addField(btn.dataset.type));
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('saveFormBtn').addEventListener('click', saveForm);
    document.getElementById('clearFormBtn').addEventListener('click', () => showConfirm('Are you sure you want to clear the entire form?', clearForm));
    document.getElementById('viewResponsesBtn').addEventListener('click', viewResponses);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalSave').addEventListener('click', saveFieldSettings);
    document.getElementById('responsesClose').addEventListener('click', () => hideModal('responsesModal'));
    document.getElementById('confirmCancel').addEventListener('click', () => hideModal('confirmModal'));

    document.getElementById('formTitle').addEventListener('input', updateEmptyState);
    document.getElementById('submitBtnText').addEventListener('input', updateEmptyState);
}

function addField(type) {
    const field = {
        id: Date.now(),
        type: type,
        label: fieldTypes[type].label,
        placeholder: fieldTypes[type].hasPlaceholder ? 'Enter ' + fieldTypes[type].label.toLowerCase() : '',
        required: false,
        options: fieldTypes[type].hasOptions ? ['Option 1', 'Option 2', 'Option 3'] : [],
        validation: ''
    };

    formFields.push(field);
    renderFields();
    updateEmptyState();
    showToast(`${fieldTypes[type].label} added successfully!`);
}

function renderFields() {
    const container = document.getElementById('formFields');
    container.innerHTML = '';

    formFields.forEach((field, index) => {
        const fieldElement = createFieldElement(field, index);
        container.appendChild(fieldElement);
    });
}

function createFieldElement(field, index) {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.draggable = true;
    div.dataset.index = index;

    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);
    div.addEventListener('dragend', handleDragEnd);

    const typeInfo = fieldTypes[field.type];
    
    div.innerHTML = `
        <div class="field-header">
            <div class="field-label">
                ${typeInfo.icon} ${field.label}
                ${field.required ? '<span class="required-badge">*</span>' : ''}
            </div>
            <div class="field-actions">
                <button class="icon-btn edit" onclick="editField(${index})">✏️</button>
                <button class="icon-btn delete" onclick="deleteField(${index})">🗑️</button>
            </div>
        </div>
        <div class="field-preview">
            ${renderFieldPreview(field)}
        </div>
    `;

    return div;
}

function renderFieldPreview(field) {
    switch (field.type) {
        case 'textarea':
            return `<textarea placeholder="${field.placeholder}" disabled></textarea>`;
        case 'dropdown':
            return `<select disabled>
                <option>Select an option</option>
                ${field.options.map(opt => `<option>${opt}</option>`).join('')}
            </select>`;
        case 'radio':
            return `<div class="radio-group">
                ${field.options.map((opt, i) => `
                    <div class="radio-option">
                        <input type="radio" name="radio-${field.id}" id="radio-${field.id}-${i}" disabled>
                        <label for="radio-${field.id}-${i}">${opt}</label>
                    </div>
                `).join('')}
            </div>`;
        case 'checkbox':
            return `<div class="checkbox-group">
                ${field.options.map((opt, i) => `
                    <div class="checkbox-option">
                        <input type="checkbox" id="check-${field.id}-${i}" disabled>
                        <label for="check-${field.id}-${i}">${opt}</label>
                    </div>
                `).join('')}
            </div>`;
        default:
            return `<input type="${field.type}" placeholder="${field.placeholder}" disabled>`;
    }
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = getDragAfterElement(e.clientY);
    const dragging = document.querySelector('.dragging');
    
    if (afterElement == null) {
        this.parentElement.appendChild(dragging);
    } else {
        this.parentElement.insertBefore(dragging, afterElement);
    }
    
    this.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const fromIndex = parseInt(draggedElement.dataset.index);
    const toIndex = parseInt(this.dataset.index);
    
    if (fromIndex !== toIndex) {
        const [movedField] = formFields.splice(fromIndex, 1);
        formFields.splice(toIndex, 0, movedField);
        renderFields();
        showToast('Field reordered successfully!');
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.field-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function getDragAfterElement(y) {
    const draggableElements = [...document.querySelectorAll('.field-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function editField(index) {
    currentEditingField = index;
    const field = formFields[index];
    
    document.getElementById('fieldLabel').value = field.label;
    document.getElementById('fieldPlaceholder').value = field.placeholder;
    document.getElementById('fieldRequired').checked = field.required;
    document.getElementById('fieldValidation').value = field.validation;
    
    const optionsGroup = document.getElementById('optionsGroup');
    const validationGroup = document.getElementById('validationGroup');
    
    if (fieldTypes[field.type].hasOptions) {
        optionsGroup.style.display = 'block';
        document.getElementById('fieldOptions').value = field.options.join(', ');
    } else {
        optionsGroup.style.display = 'none';
    }
    
    if (fieldTypes[field.type].hasPlaceholder) {
        validationGroup.style.display = 'block';
    } else {
        validationGroup.style.display = 'none';
    }
    
    showModal('fieldModal');
}

function saveFieldSettings() {
    if (currentEditingField === null) return;
    
    const field = formFields[currentEditingField];
    field.label = document.getElementById('fieldLabel').value || field.label;
    field.placeholder = document.getElementById('fieldPlaceholder').value || field.placeholder;
    field.required = document.getElementById('fieldRequired').checked;
    field.validation = document.getElementById('fieldValidation').value;
    
    if (fieldTypes[field.type].hasOptions) {
        const optionsText = document.getElementById('fieldOptions').value;
        field.options = optionsText.split(',').map(opt => opt.trim()).filter(opt => opt);
    }
    
    renderFields();
    closeModal();
    showToast('Field settings updated!');
}

function deleteField(index) {
    showConfirm('Are you sure you want to delete this field?', () => {
        formFields.splice(index, 1);
        renderFields();
        updateEmptyState();
        showToast('Field deleted successfully!');
    });
}

function switchMode(mode) {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    if (mode === 'edit') {
        document.getElementById('editMode').classList.remove('hidden');
        document.getElementById('previewMode').classList.add('hidden');
    } else {
        document.getElementById('editMode').classList.add('hidden');
        document.getElementById('previewMode').classList.remove('hidden');
        renderPreview();
    }
}

function renderPreview() {
    const container = document.getElementById('previewContainer');
    const formTitle = document.getElementById('formTitle').value || 'Untitled Form';
    const submitText = document.getElementById('submitBtnText').value || 'Submit Form';
    
    let html = `
        <form class="preview-form" id="previewForm">
            <h2 class="preview-title">${formTitle}</h2>
    `;
    
    formFields.forEach((field, index) => {
        html += `<div class="preview-field">`;
        html += `<label>${field.label}${field.required ? ' <span style="color: #f5576c;">*</span>' : ''}</label>`;
        
        switch (field.type) {
            case 'textarea':
                html += `<textarea name="field-${index}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}></textarea>`;
                break;
            case 'dropdown':
                html += `<select name="field-${index}" ${field.required ? 'required' : ''}>
                    <option value="">Select an option</option>
                    ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>`;
                break;
            case 'radio':
                html += `<div class="radio-group">
                    ${field.options.map((opt, i) => `
                        <div class="radio-option">
                            <input type="radio" name="field-${index}" value="${opt}" id="preview-radio-${index}-${i}" ${field.required && i === 0 ? 'required' : ''}>
                            <label for="preview-radio-${index}-${i}">${opt}</label>
                        </div>
                    `).join('')}
                </div>`;
                break;
            case 'checkbox':
                html += `<div class="checkbox-group">
                    ${field.options.map((opt, i) => `
                        <div class="checkbox-option">
                            <input type="checkbox" name="field-${index}" value="${opt}" id="preview-check-${index}-${i}">
                            <label for="preview-check-${index}-${i}">${opt}</label>
                        </div>
                    `).join('')}
                </div>`;
                break;
            default:
                html += `<input type="${field.type}" name="field-${index}" placeholder="${field.placeholder}" ${field.required ? 'required' : ''} ${field.validation ? `pattern="${field.validation}"` : ''}>`;
        }
        
        html += `</div>`;
    });
    
    html += `<button type="submit" class="preview-submit">${submitText}</button>`;
    html += `</form>`;
    
    container.innerHTML = html;
    
    document.getElementById('previewForm').addEventListener('submit', handleFormSubmit);
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const response = {
        timestamp: new Date().toLocaleString(),
        data: {}
    };
    
    formFields.forEach((field, index) => {
        const fieldName = `field-${index}`;
        
        if (field.type === 'checkbox') {
            response.data[field.label] = formData.getAll(fieldName).join(', ') || 'None';
        } else {
            response.data[field.label] = formData.get(fieldName) || '';
        }
    });
    
    formResponses.push(response);
    localStorage.setItem('formResponses', JSON.stringify(formResponses));
    
    showToast('Form submitted successfully!');
    e.target.reset();
}

function viewResponses() {
    const container = document.getElementById('responsesTable');
    
    if (formResponses.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--text-secondary);">No responses yet. Submit the form in preview mode to see responses here.</p>';
    } else {
        let html = '<div class="responses-table"><table>';
        html += '<thead><tr><th>Timestamp</th>';
        
        formFields.forEach(field => {
            html += `<th>${field.label}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        formResponses.forEach(response => {
            html += `<tr><td>${response.timestamp}</td>`;
            formFields.forEach(field => {
                html += `<td>${response.data[field.label] || '-'}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }
    
    showModal('responsesModal');
}

function saveForm() {
    const formData = {
        title: document.getElementById('formTitle').value,
        submitText: document.getElementById('submitBtnText').value,
        fields: formFields
    };
    
    localStorage.setItem('formBuilder', JSON.stringify(formData));
    showToast('Form saved successfully!');
}

function loadFromStorage() {
    const saved = localStorage.getItem('formBuilder');
    if (saved) {
        const formData = JSON.parse(saved);
        document.getElementById('formTitle').value = formData.title || 'Untitled Form';
        document.getElementById('submitBtnText').value = formData.submitText || 'Submit Form';
        formFields = formData.fields || [];
        renderFields();
        updateEmptyState();
    }
    
    const savedResponses = localStorage.getItem('formResponses');
    if (savedResponses) {
        formResponses = JSON.parse(savedResponses);
    }
}

function clearForm() {
    formFields = [];
    formResponses = [];
    document.getElementById('formTitle').value = 'Untitled Form';
    document.getElementById('submitBtnText').value = 'Submit Form';
    localStorage.removeItem('formBuilder');
    localStorage.removeItem('formResponses');
    renderFields();
    updateEmptyState();
    showToast('Form cleared successfully!');
}

function updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    emptyState.style.display = formFields.length === 0 ? 'block' : 'none';
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode!`);
}

function updateThemeIcon(theme) {
    document.querySelector('.theme-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function closeModal() {
    hideModal('fieldModal');
    currentEditingField = null;
}

function showConfirm(message, callback) {
    document.getElementById('confirmMessage').textContent = message;
    showModal('confirmModal');
    
    document.getElementById('confirmOk').onclick = () => {
        callback();
        hideModal('confirmModal');
    };
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
