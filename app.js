document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        renderSite(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function renderSite(data) {
    // Site Configuration
    if (data.siteConfig) {
        document.title = data.siteConfig.title;
        const heroTitle = document.getElementById('hero-title');
        const heroSubtitle = document.getElementById('hero-subtitle');

        if (heroTitle) heroTitle.textContent = data.siteConfig.title || "TGμ";
        if (heroSubtitle) heroSubtitle.textContent = data.siteConfig.subtitle || "";

        const contactBtn = document.getElementById('contact-button');
        if (contactBtn && data.siteConfig.contactEmail) {
            contactBtn.href = `mailto:${data.siteConfig.contactEmail}`;
        }

        // Could handle hero background here if we were using it
    }

    // Events
    const eventsContainer = document.getElementById('events-container');
    if (eventsContainer && data.events) {
        eventsContainer.innerHTML = '';
        data.events.forEach(event => {
            const card = document.createElement('div');
            card.className = 'event-card';

            const imageSrc = event.image || 'assets/event_thumb.png';
            const detailLink = event.link || '#';
            card.innerHTML = `
                <div class="event-image-container">
                    <img src="${imageSrc}" alt="${event.title}" class="event-image">
                </div>
                <div class="event-content">
                    <div class="event-date">${event.date}</div>
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-desc">${event.description}</p>
                    <a href="${detailLink}" class="read-more" target="_blank" rel="noopener noreferrer">詳細を見る</a>
                </div>
            `;
            eventsContainer.appendChild(card);
        });
    }

    // About
    if (data.sections && data.sections.about) {
        const aboutText = document.getElementById('about-text');
        if (aboutText) aboutText.innerHTML = data.sections.about.content;
    }

    if (data.siteConfig && data.siteConfig.leaders) {
        const leaders = document.getElementById('about-leaders');
        if (leaders) leaders.textContent = data.siteConfig.leaders;
    }

    // Activities
    const actContainer = document.getElementById('activities-container');
    const mediaContainer = document.getElementById('media-container');
    if (data.activities) {
        if (actContainer) {
            actContainer.innerHTML = '';

            // Render PR Video if available
            if (data.activities.prVideoUrl) {
                const videoDiv = document.createElement('div');
                videoDiv.className = 'activity-video-container';
                videoDiv.innerHTML = `
                    <iframe src="${data.activities.prVideoUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                `;
                actContainer.appendChild(videoDiv);
            }

            if (data.activities.items) {
                data.activities.items.forEach(act => {
                    const div = document.createElement('div');
                    div.className = 'activity-item';
                    div.innerHTML = `
                    <div class="activity-date">${act.date || ''}</div>
                    <h3 class="activity-title">${act.title || ''}</h3>
                    <div class="activity-content">${(act.content || '').replace(/\n/g, '<br>')}</div>
                `;
                    actContainer.appendChild(div);
                });
            }
            if (mediaContainer && data.activities.media) {
                mediaContainer.innerHTML = '<h3 class="media-title">メディア掲載実績・連携</h3>';
                const grid = document.createElement('div');
                grid.className = 'media-links-grid';
                data.activities.media.forEach(m => {
                    const a = document.createElement('a');
                    a.className = 'link-card';
                    a.href = m.url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = m.title;
                    grid.appendChild(a);
                });
                mediaContainer.appendChild(grid);
            }
        }

        // Links
        const linksContainer = document.getElementById('links-container');
        if (linksContainer && data.sections && data.sections.links) {
            linksContainer.innerHTML = '';
            data.sections.links.forEach(linkObj => {
                const a = document.createElement('a');
                a.className = 'link-card';
                a.href = linkObj.url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.textContent = linkObj.title;
                linksContainer.appendChild(a);
            });
        }

        // Subpage Logic (event.html)
        if (window.location.pathname.includes('event.html')) {
            renderEventPage(data);
        }
    }

    function renderEventPage(data) {
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('id');
        const loadingEl = document.getElementById('loading');
        const contentEl = document.getElementById('event-page-content');

        if (!eventId || !data.events) {
            loadingEl.textContent = 'Event not found.';
            return;
        }

        const event = data.events.find(e => e.id === eventId);

        if (!event) {
            loadingEl.textContent = 'Event not found.';
            return;
        }

        // Populate data
        document.title = `${event.title} - ${data.siteConfig.title || 'TGμ'}`;
        document.getElementById('event-title').textContent = event.title;
        document.getElementById('event-date').textContent = event.date || '未定';
        document.getElementById('event-time').textContent = event.time || '未定';
        document.getElementById('event-location').textContent = event.location || '未定';
        document.getElementById('event-description').textContent = event.description;

        const detailsSection = document.getElementById('event-details-section');
        if (event.details) {
            document.getElementById('event-details').textContent = event.details;
        } else {
            detailsSection.style.display = 'none';
        }

        const linkContainer = document.getElementById('event-link-container');
        const eventLink = document.getElementById('event-link');
        if (event.link) {
            eventLink.href = event.link;
        } else {
            linkContainer.style.display = 'none';
        }

        const heroImage = document.getElementById('event-hero-image');
        if (event.image) {
            heroImage.src = event.image;
        }

        // Show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';

        // Update Meta Tags for Rich Links (OGP/Twitter)
        const pageUrl = window.location.href;
        const absImage = event.image ? new URL(event.image, window.location.origin).href : 'https://explayground.com/assets/event_thumb.png';

        const setMeta = (id, content) => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('content', content);
        };

        setMeta('og-title', `${event.title} - TGμ`);
        setMeta('og-description', event.description);
        setMeta('og-url', pageUrl);
        setMeta('og-image', absImage);

        setMeta('twitter-title', `${event.title} - TGμ`);
        setMeta('twitter-description', event.description);
        setMeta('twitter-image', absImage);
    }
