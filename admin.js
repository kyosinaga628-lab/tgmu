let currentData = null;

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

function login() {
    const input = document.getElementById('password-input').value;
    const tokenInput = document.getElementById('github-token-input').value.trim();

    if (currentData && currentData.admin && input === currentData.admin.password) {
        if (tokenInput) {
            localStorage.setItem('tgmu_github_token', tokenInput);
        }
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('editor-screen').classList.remove('hidden');
        renderEditor();
    } else {
        alert('Incorrect password');
    }
}

function logout() {
    if (confirm('ログアウトし、保存されているGitHubトークンを削除しますか？')) {
        localStorage.removeItem('tgmu_github_token');
        location.reload();
    }
}

function renderEditor() {
    const container = document.getElementById('editor-forms');
    container.innerHTML = '';

    // Site Config
    createSection(container, 'Site Configuration', [
        { key: 'siteConfig.title', label: 'Title', type: 'text', value: currentData.siteConfig.title },
        { key: 'siteConfig.subtitle', label: 'Subtitle', type: 'text', value: currentData.siteConfig.subtitle },
        { key: 'siteConfig.description', label: 'Description', type: 'textarea', value: currentData.siteConfig.description },
        { key: 'siteConfig.leaders', label: 'Leaders', type: 'text', value: currentData.siteConfig.leaders },
        { key: 'siteConfig.contactEmail', label: 'Contact Email', type: 'text', value: currentData.siteConfig.contactEmail || '' },
    ]);

    // About
    createSection(container, 'About Section', [
        { key: 'sections.about.content', label: 'Content (HTML allowed)', type: 'textarea', value: currentData.sections.about.content }
    ]);

    // Activities
    const actsDiv = document.createElement('div');
    actsDiv.innerHTML = '<h3>Activities (活動実績)</h3>';
    if (!currentData.activities) currentData.activities = { title: 'ACTIVITIES', prVideoUrl: '', items: [], media: [] };
    if (!currentData.activities.items) currentData.activities.items = [];
    if (!currentData.activities.media) currentData.activities.media = [];

    // PR Video URL
    const videoGroup = document.createElement('div');
    videoGroup.className = 'form-group';
    videoGroup.innerHTML = '<label>Youtube PR Video Embed URL (e.g. https://www.youtube.com/embed/...)</label>';
    const videoInput = document.createElement('input');
    videoInput.type = 'text';
    videoInput.value = currentData.activities.prVideoUrl || '';
    videoInput.onchange = (e) => {
        currentData.activities.prVideoUrl = e.target.value;
    };
    videoGroup.appendChild(videoInput);
    actsDiv.appendChild(videoGroup);

    // Activities Items
    currentData.activities.items.forEach((act, index) => {
        const actEl = document.createElement('div');
        actEl.className = 'event-item';

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.innerHTML = `<h4>Activity Report ${index + 1}</h4>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Report';
        deleteBtn.style.background = '#dc3545';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.width = 'auto';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.marginTop = '0';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this report?')) {
                currentData.activities.items.splice(index, 1);
                renderEditor();
            }
        };
        headerDiv.appendChild(deleteBtn);
        actEl.appendChild(headerDiv);

        [
            { k: 'date', l: 'Date (e.g. 2023年4月22日)' },
            { k: 'title', l: 'Title' },
            { k: 'content', l: 'Content', t: 'textarea' },
            { k: 'link', l: 'Detail Link (Optional, URL)' }
        ].forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${field.l}</label>`;

            let input;
            if (field.t === 'textarea') {
                input = document.createElement('textarea');
                input.value = act[field.k] || '';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = act[field.k] || '';
            }

            input.onchange = (e) => {
                currentData.activities.items[index][field.k] = e.target.value;
            };

            group.appendChild(input);
            actEl.appendChild(group);
        });

        actsDiv.appendChild(actEl);
    });

    const addActBtn = document.createElement('button');
    addActBtn.textContent = '+ Add New Report';
    addActBtn.style.marginBottom = '20px';
    addActBtn.onclick = () => {
        currentData.activities.items.push({
            date: '',
            title: 'New Report',
            content: ''
        });
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

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.innerHTML = `<h4>Media Link ${index + 1}</h4>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Link';
        deleteBtn.style.background = '#dc3545';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.width = 'auto';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.marginTop = '0';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this media link?')) {
                currentData.activities.media.splice(index, 1);
                renderEditor();
            }
        };
        headerDiv.appendChild(deleteBtn);
        mEl.appendChild(headerDiv);

        [
            { k: 'title', l: 'Title' },
            { k: 'url', l: 'URL' }
        ].forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${field.l}</label>`;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = m[field.k] || '';
            input.onchange = (e) => {
                currentData.activities.media[index][field.k] = e.target.value;
            };

            group.appendChild(input);
            mEl.appendChild(group);
        });

        actsDiv.appendChild(mEl);
    });

    const addMediaBtn = document.createElement('button');
    addMediaBtn.textContent = '+ Add New Media Link';
    addMediaBtn.style.marginBottom = '30px';
    addMediaBtn.onclick = () => {
        currentData.activities.media.push({
            title: 'New Media Link',
            url: ''
        });
        renderEditor();
    };
    actsDiv.appendChild(addMediaBtn);

    container.appendChild(actsDiv);

    // Events
    const eventsDiv = document.createElement('div');
    eventsDiv.innerHTML = '<h3>News / Events</h3>';
    currentData.events.forEach((event, index) => {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.innerHTML = `<h4>Event ${index + 1}</h4>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Event';
        deleteBtn.style.background = '#dc3545';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.width = 'auto';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.marginTop = '0';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this event?')) {
                currentData.events.splice(index, 1);
                renderEditor();
            }
        };
        headerDiv.appendChild(deleteBtn);
        eventEl.appendChild(headerDiv);

        [
            { k: 'id', l: 'Event ID (Unique, e.g. event-123)' },
            { k: 'title', l: 'Title' },
            { k: 'date', l: 'Date (e.g. 2026-03-20)' },
            { k: 'time', l: 'Time' },
            { k: 'location', l: 'Location' },
            { k: 'description', l: 'Short Description', t: 'textarea' },
            { k: 'details', l: 'Main Details (Text)', t: 'textarea' },
            { k: 'link', l: 'External URL (Link)' },
            { k: 'image', l: 'Image Path (e.g. assets/img.png)' }
        ].forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${field.l}</label>`;

            let input;
            if (field.t === 'textarea') {
                input = document.createElement('textarea');
                input.value = event[field.k] || '';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = event[field.k] || '';
            }

            input.onchange = (e) => {
                currentData.events[index][field.k] = e.target.value;
            };

            group.appendChild(input);
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
            title: 'New Event',
            date: '',
            time: '',
            location: '',
            description: '',
            details: '',
            link: '',
            image: ''
        });
        renderEditor();
    };
    eventsDiv.appendChild(addEventBtn);

    container.appendChild(eventsDiv);

    // Links Section
    const linksDiv = document.createElement('div');
    linksDiv.innerHTML = '<h3>Links Section</h3>';
    if (!currentData.sections) currentData.sections = {};
    if (!currentData.sections.links) currentData.sections.links = [];

    currentData.sections.links.forEach((linkObj, index) => {
        const linkEl = document.createElement('div');
        linkEl.className = 'event-item'; // Reusing event-item styling

        const headerDiv = document.createElement('div');
        headerDiv.style.display = 'flex';
        headerDiv.style.justifyContent = 'space-between';
        headerDiv.style.alignItems = 'center';
        headerDiv.innerHTML = `<h4>Link ${index + 1}</h4>`;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete Link';
        deleteBtn.style.background = '#dc3545';
        deleteBtn.style.color = '#fff';
        deleteBtn.style.width = 'auto';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.marginTop = '0';
        deleteBtn.onclick = () => {
            if (confirm('Are you sure you want to delete this link?')) {
                currentData.sections.links.splice(index, 1);
                renderEditor();
            }
        };
        headerDiv.appendChild(deleteBtn);
        linkEl.appendChild(headerDiv);

        [
            { k: 'title', l: 'Link Title (Display Text)' },
            { k: 'url', l: 'URL (e.g. https://...)' }
        ].forEach(field => {
            const group = document.createElement('div');
            group.className = 'form-group';
            group.innerHTML = `<label>${field.l}</label>`;

            const input = document.createElement('input');
            input.type = 'text';
            input.value = linkObj[field.k] || '';
            input.onchange = (e) => {
                currentData.sections.links[index][field.k] = e.target.value;
            };

            group.appendChild(input);
            linkEl.appendChild(group);
        });

        linksDiv.appendChild(linkEl);
    });

    const addLinkBtn = document.createElement('button');
    addLinkBtn.textContent = '+ Add New Link';
    addLinkBtn.style.marginBottom = '30px';
    addLinkBtn.onclick = () => {
        currentData.sections.links.push({
            title: 'New Link',
            url: ''
        });
        renderEditor();
    };
    linksDiv.appendChild(addLinkBtn);

    container.appendChild(linksDiv);
}

function createSection(parent, title, fields) {
    const section = document.createElement('div');
    section.innerHTML = `<h3>${title}</h3>`;

    fields.forEach(field => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `<label>${field.label}</label>`;

        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.value = field.value;
        } else {
            input = document.createElement('input');
            input.type = 'text';
            input.value = field.value;
        }

        input.onchange = (e) => {
            setNestedValue(currentData, field.key, e.target.value);
        };

        group.appendChild(input);
        section.appendChild(group);
    });

    parent.appendChild(section);
}

function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

async function saveData() {
    const messageEl = document.getElementById('message');
    messageEl.className = 'hidden';

    // Ensure the entered password is bound to the payload so the server can verify
    const passwordInput = document.getElementById('password-input').value;
    // Prefer the saved token, fallback to whatever is in the input box
    const githubToken = localStorage.getItem('tgmu_github_token') || document.getElementById('github-token-input').value.trim();

    if (!currentData.admin) {
        currentData.admin = {};
    }
    currentData.admin.password = passwordInput;

    const jsonString = JSON.stringify(currentData, null, 2);

    // If GitHub Token exists, try pushing directly
    if (githubToken) {
        try {
            messageEl.textContent = 'Saving directly to GitHub...';
            messageEl.classList.remove('hidden');
            messageEl.classList.remove('error');
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
                throw new Error('Failed to fetch current file SHA from GitHub.');
            }
            const getJson = await getRes.json();
            const currentSha = getJson.sha;

            // 2. Base64 encode the new JSON
            // In browser, btoa() requires ASCII. To support Japanese characters:
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
                const errorData = await putRes.json();
                throw new Error('GitHub API Error: ' + (errorData.message || putRes.statusText));
            }

            messageEl.textContent = 'Successfully saved to GitHub! Changes will be live shortly.';
            messageEl.classList.remove('hidden');
            messageEl.classList.add('success');
            return;
        } catch (githubError) {
            console.error(githubError);
            messageEl.textContent = 'GitHub Save Failed: ' + githubError.message + '. Falling back to local/download.';
            messageEl.classList.remove('success');
            messageEl.classList.add('error');
            // Continue to fallback...
        }
    }

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
        messageEl.textContent = "Server not found. Downloaded data.json instead. Please upload manually to GitHub.";
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
