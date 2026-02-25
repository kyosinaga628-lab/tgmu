let currentData = null;

// ============================================================
// Utility Functions
// ============================================================

// SHA-256 hash helper using Web Crypto API
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validation helpers
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
    if (!url) return true; // empty is OK (optional)
    return /^(https?:\/\/|\/|\.\/|ref\/)/.test(url);
}

// Create a delete button with standard styling
function createDeleteButton(label, onClickFn) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'btn-danger nowrap';
    btn.onclick = onClickFn;
    return btn;
}

// Create a section header row with title and optional delete button
function createItemHeader(titleText, deleteBtn) {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'item-header';
    headerDiv.innerHTML = `<h4>${titleText}</h4>`;
    if (deleteBtn) headerDiv.appendChild(deleteBtn);
    return headerDiv;
}

// Create a form group with label and input/textarea
function createFormGroup(label, type, value, onChangeFn, options = {}) {
    const group = document.createElement('div');
    group.className = 'form-group' + (options.extraClass ? ' ' + options.extraClass : '');

    if (label) {
        group.innerHTML = `<label>${label}</label>`;
    }

    let input;
    if (type === 'textarea') {
        // If richText, add toolbar
        if (options.richText) {
            const toolbar = document.createElement('div');
            toolbar.className = 'toolbar';

            const boldBtn = document.createElement('button');
            boldBtn.textContent = 'B (太字)';
            boldBtn.type = 'button';

            const linkBtn = document.createElement('button');
            linkBtn.textContent = '🔗 リンク';
            linkBtn.type = 'button';

            const brBtn = document.createElement('button');
            brBtn.textContent = '↵ 改行';
            brBtn.type = 'button';

            toolbar.appendChild(boldBtn);
            toolbar.appendChild(linkBtn);
            toolbar.appendChild(brBtn);
            group.appendChild(toolbar);

            input = document.createElement('textarea');
            input.value = value || '';

            boldBtn.onclick = () => {
                const start = input.selectionStart;
                const end = input.selectionEnd;
                const sel = input.value.substring(start, end) || '太字テキスト';
                input.value = input.value.substring(0, start) + '<b>' + sel + '</b>' + input.value.substring(end);
                input.focus();
                if (onChangeFn) onChangeFn({ target: input });
            };

            linkBtn.onclick = () => {
                const url = prompt('URL を入力してください:', 'https://');
                if (url) {
                    const start = input.selectionStart;
                    const end = input.selectionEnd;
                    const sel = input.value.substring(start, end) || 'リンクテキスト';
                    input.value = input.value.substring(0, start) + `<a href="${url}" target="_blank">${sel}</a>` + input.value.substring(end);
                    input.focus();
                    if (onChangeFn) onChangeFn({ target: input });
                }
            };

            brBtn.onclick = () => {
                const pos = input.selectionStart;
                input.value = input.value.substring(0, pos) + '<br>' + input.value.substring(pos);
                input.focus();
                if (onChangeFn) onChangeFn({ target: input });
            };
        } else {
            input = document.createElement('textarea');
            input.value = value || '';
        }
    } else {
        input = document.createElement('input');
        input.type = type || 'text';
        input.value = value || '';
    }

    if (options.placeholder) input.placeholder = options.placeholder;

    // Validation for email/url
    if (options.validate === 'email') {
        input.onblur = () => {
            if (input.value && !isValidEmail(input.value)) {
                input.classList.add('invalid');
                input.classList.remove('valid');
            } else if (input.value) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('invalid', 'valid');
            }
        };
    } else if (options.validate === 'url') {
        input.onblur = () => {
            if (input.value && !isValidUrl(input.value)) {
                input.classList.add('invalid');
                input.classList.remove('valid');
            } else if (input.value) {
                input.classList.remove('invalid');
                input.classList.add('valid');
            } else {
                input.classList.remove('invalid', 'valid');
            }
        };
    }

    if (onChangeFn) input.onchange = onChangeFn;

    group.appendChild(input);
    return group;
}

// ============================================================
// Data Loading & Authentication
// ============================================================

async function loadData() {
    try {
        const response = await fetch('data.json');
        currentData = await response.json();
    } catch (e) {
        alert('Failed to load data.json');
    }

    // Pre-fill GitHub token if it exists in localStorage
    const savedToken = localStorage.getItem('tgmu_github_token');
    if (savedToken) {
        const tokenInput = document.getElementById('github-token-input');
        if (tokenInput) {
            tokenInput.value = savedToken;
        }
    }
}

async function login() {
    const input = document.getElementById('password-input').value;
    const tokenInput = document.getElementById('github-token-input').value.trim();

    // Hash the input password and compare with stored hash
    const inputHash = await sha256(input);
    if (currentData && currentData.admin && inputHash === currentData.admin.passwordHash) {
        // Validate PAT if provided
        if (tokenInput) {
            try {
                const testRes = await fetch('https://api.github.com/repos/kyosinaga628-lab/tgmu/contents/data.json?ref=main', {
                    headers: {
                        'Authorization': `token ${tokenInput}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (!testRes.ok) {
                    const status = testRes.status;
                    if (status === 401) {
                        alert('GitHub PATが無効または期限切れです。新しいトークンを生成してください。\n\nGitHub → Settings → Developer settings → Personal access tokens');
                        return;
                    } else if (status === 403) {
                        alert('GitHub PATに必要な権限がありません。\n\nFine-grained tokenの場合:\n・Repository access → kyosinaga628-lab/tgmu を選択\n・Permissions → Contents: Read and write');
                        return;
                    } else if (status === 404) {
                        alert('リポジトリにアクセスできません。PATの権限を確認してください。\n\nFine-grained tokenの場合:\n・Repository access → kyosinaga628-lab/tgmu を選択');
                        return;
                    }
                }
                localStorage.setItem('tgmu_github_token', tokenInput);
            } catch (e) {
                alert('ネットワークエラー: GitHubに接続できません。インターネット接続を確認してください。');
                return;
            }
        }
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.remove('hidden');
        renderEditor();
    } else {
        alert('パスワードが正しくありません');
    }
}

function logout() {
    if (confirm('ログアウトし、保存されているGitHubトークンを削除しますか？')) {
        localStorage.removeItem('tgmu_github_token');
        location.reload();
    }
}

// ============================================================
// Editor Rendering
// ============================================================

function renderEditor() {
    const container = document.getElementById('editor-forms');
    container.innerHTML = '';

    // Site Config
    renderSiteConfig(container);

    // About
    renderAboutSection(container);

    // Activities
    renderActivities(container);

    // Events
    renderEvents(container);

    // Links
    renderLinks(container);
}

function renderSiteConfig(container) {
    const section = document.createElement('div');
    section.innerHTML = '<h3>Site Configuration</h3>';

    const fields = [
        { key: 'siteConfig.title', label: 'Title', type: 'text', value: currentData.siteConfig.title },
        { key: 'siteConfig.subtitle', label: 'Subtitle', type: 'text', value: currentData.siteConfig.subtitle },
        { key: 'siteConfig.description', label: 'Description', type: 'textarea', value: currentData.siteConfig.description },
        { key: 'siteConfig.leaders', label: 'Leaders', type: 'text', value: currentData.siteConfig.leaders },
        { key: 'siteConfig.contactEmail', label: 'Contact Email', type: 'text', value: currentData.siteConfig.contactEmail || '', validate: 'email' },
    ];

    fields.forEach(field => {
        const group = createFormGroup(field.label, field.type, field.value, (e) => {
            setNestedValue(currentData, field.key, e.target.value);
        }, { validate: field.validate });
        section.appendChild(group);
    });

    container.appendChild(section);
}

function renderAboutSection(container) {
    const section = document.createElement('div');
    section.innerHTML = '<h3>About Section</h3>';

    const group = createFormGroup('Content (HTML allowed)', 'textarea', currentData.sections.about.content, (e) => {
        setNestedValue(currentData, 'sections.about.content', e.target.value);
    }, { richText: true });
    section.appendChild(group);

    container.appendChild(section);
}

function renderActivities(container) {
    const actsDiv = document.createElement('div');
    actsDiv.innerHTML = '<h3>Activities (活動実績)</h3>';
    if (!currentData.activities) currentData.activities = { title: 'ACTIVITIES', prVideoUrl: '', items: [], media: [] };
    if (!currentData.activities.items) currentData.activities.items = [];
    if (!currentData.activities.media) currentData.activities.media = [];

    // PR Video URL
    const videoGroup = createFormGroup(
        'Youtube PR Video Embed URL (e.g. https://www.youtube.com/embed/...)',
        'text',
        currentData.activities.prVideoUrl || '',
        (e) => { currentData.activities.prVideoUrl = e.target.value; },
        { validate: 'url' }
    );
    actsDiv.appendChild(videoGroup);

    // Activities Items
    currentData.activities.items.forEach((act, index) => {
        const actEl = document.createElement('div');
        actEl.className = 'event-item';

        const deleteBtn = createDeleteButton('Delete Report', () => {
            if (confirm('Are you sure you want to delete this report?')) {
                currentData.activities.items.splice(index, 1);
                renderEditor();
            }
        });
        actEl.appendChild(createItemHeader(`Activity Report ${index + 1}`, deleteBtn));

        const fields = [
            { k: 'date', l: 'Date (e.g. 2023年4月22日)' },
            { k: 'title', l: 'Title' },
            { k: 'content', l: 'Content', t: 'textarea', rich: true },
            { k: 'link', l: 'Detail Link (Optional, URL)', v: 'url' }
        ];

        fields.forEach(field => {
            const group = createFormGroup(field.l, field.t || 'text', act[field.k] || '', (e) => {
                currentData.activities.items[index][field.k] = e.target.value;
            }, { validate: field.v, richText: field.rich });
            actEl.appendChild(group);
        });

        actsDiv.appendChild(actEl);
    });

    const addActBtn = document.createElement('button');
    addActBtn.textContent = '+ Add New Report';
    addActBtn.style.marginBottom = '20px';
    addActBtn.onclick = () => {
        currentData.activities.items.push({ date: '', title: 'New Report', content: '' });
        renderEditor();
    };
    actsDiv.appendChild(addActBtn);

    // Media Links
    const mediaHeader = document.createElement('h4');
    mediaHeader.textContent = 'Media / External Links';
    mediaHeader.style.marginTop = '20px';
    mediaHeader.style.marginBottom = '10px';
    actsDiv.appendChild(mediaHeader);

    currentData.activities.media.forEach((m, index) => {
        const mEl = document.createElement('div');
        mEl.className = 'event-item';

        const deleteBtn = createDeleteButton('Delete Link', () => {
            if (confirm('Are you sure you want to delete this media link?')) {
                currentData.activities.media.splice(index, 1);
                renderEditor();
            }
        });
        mEl.appendChild(createItemHeader(`Media Link ${index + 1}`, deleteBtn));

        [{ k: 'title', l: 'Title' }, { k: 'url', l: 'URL', v: 'url' }].forEach(field => {
            const group = createFormGroup(field.l, 'text', m[field.k] || '', (e) => {
                currentData.activities.media[index][field.k] = e.target.value;
            }, { validate: field.v });
            mEl.appendChild(group);
        });

        actsDiv.appendChild(mEl);
    });

    const addMediaBtn = document.createElement('button');
    addMediaBtn.textContent = '+ Add New Media Link';
    addMediaBtn.style.marginBottom = '30px';
    addMediaBtn.onclick = () => {
        currentData.activities.media.push({ title: 'New Media Link', url: '' });
        renderEditor();
    };
    actsDiv.appendChild(addMediaBtn);

    container.appendChild(actsDiv);
}

function renderEvents(container) {
    const eventsDiv = document.createElement('div');
    eventsDiv.innerHTML = '<h3>News / Events</h3>';

    currentData.events.forEach((event, index) => {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';

        const deleteBtn = createDeleteButton('Delete Event', () => {
            if (confirm('Are you sure you want to delete this event?')) {
                currentData.events.splice(index, 1);
                renderEditor();
            }
        });
        eventEl.appendChild(createItemHeader(`Event ${index + 1}`, deleteBtn));

        const fields = [
            { k: 'id', l: 'Event ID (Unique, e.g. event-123)' },
            { k: 'title', l: 'Title' },
            { k: 'date', l: 'Date (e.g. 2026-03-20)' },
            { k: 'time', l: 'Time' },
            { k: 'location', l: 'Location' },
            { k: 'description', l: 'Short Description', t: 'textarea' },
            { k: 'details', l: 'Main Details (Text)', t: 'textarea', rich: true },
            { k: 'link', l: 'External URL (Link)', v: 'url' },
            { k: 'image', l: 'Image Path (e.g. assets/img.png)' }
        ];

        fields.forEach(field => {
            const group = createFormGroup(field.l, field.t || 'text', event[field.k] || '', (e) => {
                currentData.events[index][field.k] = e.target.value;
            }, { validate: field.v, richText: field.rich });
            eventEl.appendChild(group);
        });

        eventsDiv.appendChild(eventEl);
    });

    const addEventBtn = document.createElement('button');
    addEventBtn.textContent = '+ Add New Event';
    addEventBtn.style.marginBottom = '30px';
    addEventBtn.onclick = () => {
        currentData.events.push({
            id: 'event-' + Date.now(),
            title: 'New Event', date: '', time: '', location: '',
            description: '', details: '', link: '', image: ''
        });
        renderEditor();
    };
    eventsDiv.appendChild(addEventBtn);

    container.appendChild(eventsDiv);
}

function renderLinks(container) {
    const linksDiv = document.createElement('div');
    linksDiv.innerHTML = '<h3>Links Section</h3>';
    if (!currentData.sections) currentData.sections = {};
    if (!currentData.sections.links) currentData.sections.links = [];

    // Migrate flat links to category structure if needed
    if (currentData.sections.links.length > 0 && currentData.sections.links[0] && !currentData.sections.links[0].category && currentData.sections.links[0].title) {
        currentData.sections.links = [{ category: '未分類', items: currentData.sections.links }];
    }

    currentData.sections.links.forEach((cat, catIndex) => {
        const catEl = document.createElement('div');
        catEl.className = 'event-item cat-border';

        // Category header
        const catHeaderDiv = document.createElement('div');
        catHeaderDiv.className = 'item-header';
        catHeaderDiv.style.marginBottom = '10px';

        const catNameGroup = createFormGroup('カテゴリ名', 'text', cat.category || '', (e) => {
            currentData.sections.links[catIndex].category = e.target.value;
        }, { extraClass: 'flex-1 mb-0' });
        catNameGroup.style.marginRight = '10px';
        catHeaderDiv.appendChild(catNameGroup);

        const deleteCatBtn = createDeleteButton('カテゴリ削除', () => {
            if (confirm(`カテゴリ「${cat.category}」を削除しますか？\n中のリンクもすべて削除されます。`)) {
                currentData.sections.links.splice(catIndex, 1);
                renderEditor();
            }
        });
        deleteCatBtn.classList.add('nowrap');
        catHeaderDiv.appendChild(deleteCatBtn);
        catEl.appendChild(catHeaderDiv);

        // Links within this category
        if (!cat.items) cat.items = [];
        cat.items.forEach((linkObj, linkIndex) => {
            const linkEl = document.createElement('div');
            linkEl.className = 'flex-row';

            const titleGroup = createFormGroup(
                linkIndex === 0 ? 'タイトル' : '', 'text', linkObj.title || '',
                (e) => { currentData.sections.links[catIndex].items[linkIndex].title = e.target.value; },
                { extraClass: 'flex-1 mb-0', placeholder: 'リンクタイトル' }
            );
            linkEl.appendChild(titleGroup);

            const urlGroup = createFormGroup(
                linkIndex === 0 ? 'URL' : '', 'text', linkObj.url || '',
                (e) => { currentData.sections.links[catIndex].items[linkIndex].url = e.target.value; },
                { extraClass: 'flex-1 mb-0', placeholder: 'https://...', validate: 'url' }
            );
            linkEl.appendChild(urlGroup);

            const delLinkBtn = document.createElement('button');
            delLinkBtn.textContent = '×';
            delLinkBtn.className = 'btn-icon';
            delLinkBtn.onclick = () => {
                currentData.sections.links[catIndex].items.splice(linkIndex, 1);
                renderEditor();
            };
            linkEl.appendChild(delLinkBtn);

            catEl.appendChild(linkEl);
        });

        const addLinkBtn = document.createElement('button');
        addLinkBtn.textContent = '+ リンク追加';
        addLinkBtn.className = 'btn-small';
        addLinkBtn.style.marginLeft = '15px';
        addLinkBtn.onclick = () => {
            currentData.sections.links[catIndex].items.push({ title: '', url: '' });
            renderEditor();
        };
        catEl.appendChild(addLinkBtn);

        linksDiv.appendChild(catEl);
    });

    const addCatBtn = document.createElement('button');
    addCatBtn.textContent = '+ 新しいカテゴリを追加';
    addCatBtn.style.marginBottom = '30px';
    addCatBtn.onclick = () => {
        currentData.sections.links.push({ category: '新しいカテゴリ', items: [] });
        renderEditor();
    };
    linksDiv.appendChild(addCatBtn);

    container.appendChild(linksDiv);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

// ============================================================
// Save Logic
// ============================================================

async function saveData() {
    // Confirm before saving
    if (!confirm('変更を保存しますか？')) return;

    // Validate fields
    const invalidFields = document.querySelectorAll('input.invalid');
    if (invalidFields.length > 0) {
        alert('入力エラーがあります（赤くハイライトされているフィールドを確認してください）。');
        invalidFields[0].focus();
        return;
    }

    const messageEl = document.getElementById('message');
    messageEl.className = 'hidden';

    // Hash the password and bind to payload for server verification
    const passwordInput = document.getElementById('password-input').value;
    const passwordHash = await sha256(passwordInput);
    // Prefer the saved token, fallback to whatever is in the input box
    const githubToken = localStorage.getItem('tgmu_github_token') || document.getElementById('github-token-input').value.trim();

    if (!currentData.admin) {
        currentData.admin = {};
    }
    currentData.admin.passwordHash = passwordHash;

    const jsonString = JSON.stringify(currentData, null, 2);

    // If GitHub Token exists, try pushing directly (do NOT fall through to /api/save)
    if (githubToken) {
        try {
            messageEl.textContent = 'GitHubに保存中...';
            messageEl.classList.remove('hidden', 'error');
            messageEl.classList.add('success');

            const repoDetails = {
                owner: 'kyosinaga628-lab',
                repo: 'tgmu',
                path: 'data.json',
                branch: 'main'
            };

            // 1. Get the current file SHA
            const getStr = `https://api.github.com/repos/${repoDetails.owner}/${repoDetails.repo}/contents/${repoDetails.path}?ref=${repoDetails.branch}`;
            const getRes = await fetch(getStr, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!getRes.ok) {
                const status = getRes.status;
                let detail = '';
                try { detail = (await getRes.json()).message || ''; } catch (_) { }
                if (status === 401) {
                    throw new Error('認証エラー: トークンが無効または期限切れです。新しいPATを生成してください。');
                } else if (status === 403) {
                    throw new Error('権限エラー: トークンにリポジトリへの書き込み権限がありません。PATのスコープ(Contents: Read and write)を確認してください。' + (detail ? ' (' + detail + ')' : ''));
                } else if (status === 404) {
                    throw new Error('リポジトリまたはファイルが見つかりません。リポジトリ名・パスを確認してください。');
                } else {
                    throw new Error(`GitHub APIエラー (${status}): ${detail || getRes.statusText}`);
                }
            }
            const getJson = await getRes.json();
            const currentSha = getJson.sha;

            // 2. Base64 encode the new JSON
            const encodedContent = btoa(unescape(encodeURIComponent(jsonString)));

            // 3. Update the file
            const putRes = await fetch(getStr, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Update data.json via Admin Panel',
                    content: encodedContent,
                    sha: currentSha,
                    branch: repoDetails.branch
                })
            });

            if (!putRes.ok) {
                const putStatus = putRes.status;
                let putDetail = '';
                try { putDetail = (await putRes.json()).message || ''; } catch (_) { }
                if (putStatus === 409) {
                    throw new Error('競合エラー: 別の更新が先に行われました。ページをリロードして再度お試しください。');
                } else if (putStatus === 422) {
                    throw new Error('SHAの不一致: ページをリロードして再度お試しください。' + (putDetail ? ' (' + putDetail + ')' : ''));
                } else {
                    throw new Error(`GitHub API 書き込みエラー (${putStatus}): ${putDetail || putRes.statusText}`);
                }
            }

            messageEl.textContent = '✅ GitHubに保存しました！変更は数分以内に反映されます。';
            messageEl.classList.remove('hidden', 'error');
            messageEl.classList.add('success');
            return;
        } catch (githubError) {
            console.error('GitHub Save Error:', githubError);
            messageEl.textContent = '❌ GitHub保存失敗: ' + githubError.message;
            messageEl.classList.remove('hidden', 'success');
            messageEl.classList.add('error');
            // Do NOT fall through – the user intended to save via GitHub.
            return;
        }
    }

    // No GitHub token – try local server, then download fallback
    try {
        const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonString
        });

        const result = await response.json();

        messageEl.textContent = result.message;
        messageEl.classList.remove('hidden');
        messageEl.classList.add(result.success ? 'success' : 'error');

    } catch (e) {
        console.error(e);
        // Fallback for static hosting: Download JSON
        downloadJSON(currentData);
        messageEl.textContent = "ローカルサーバーが見つかりません。data.jsonをダウンロードしました。GitHubに手動でアップロードしてください。";
        messageEl.classList.remove('hidden');
        messageEl.classList.add('success');
    }
}

function downloadJSON(data) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Init
loadData();
