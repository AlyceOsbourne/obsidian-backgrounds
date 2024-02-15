const obsidian = require('obsidian');

function applyStyles(element, styles) {
    Object.assign(element.style, styles);
}

async function readAndConvertImage(app, file) {
    const data = await app.vault.readBinary(file);
    const blob = new Blob([data], {type: `image/${file.extension}`});
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function setBackground(base64String, extension, app) {
    const canvasWrapper = document.querySelector('.canvas-wrapper');
    if (canvasWrapper) {
        if (document.getElementById('pyxie-backgrounds-style')) {
            document.getElementById('pyxie-backgrounds-style').remove();
        }
        const style = document.createElement('style');
        style.id = 'pyxie-backgrounds-style';
        style.innerHTML = `
            .canvas-wrapper {
                background-image: url("data:image/${extension};base64,${base64String}");
                background-size: cover;
                background-position: center;
                // fill height
                height: 100vh;
            }
            
            .canvas-background {
                opacity: 0.2;
            }
            
            ${app.plugins.plugins['pyxie-backgrounds'].settings.css || ''}
        `;
        console.log(style.innerHTML);
        document.head.appendChild(style);
    }
    // Save the background in the plugin settings
    app.plugins.plugins['pyxie-backgrounds'].settings.background = { base64String, extension };
    app.plugins.plugins['pyxie-backgrounds'].saveSettings();
}

class ImageBackgroundModal extends obsidian.Modal {
    constructor(app) {
        super(app);
        this.app = app;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        contentEl.createEl('h3', {text: 'Select an Image as Background'});

        applyStyles(contentEl, {
            maxWidth: '80vw',
            maxHeight: '80vh',
            width: 'auto',
            height: 'auto'
        });

        const container = contentEl.createDiv();
        applyStyles(container, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            gap: '20px',
            padding: '20px'
        });

        this.loadImages().then(images => {
            images.forEach(image => {
                const card = container.createDiv();
                applyStyles(card, {
                    padding: '10px',
                    margin: '10px 0',
                    border: '1px solid #ccc',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'center'
                });

                card.createEl('img', {attr: {src: image.src, style: 'max-width: 100%; max-height: 60vh;'}});

                card.onclick = () => this.setImageAsBackground(image.data);
            });
        }).catch(err => console.error("Error loading images:", err));
    }

    async loadImages() {
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'];
        const files = this.app.vault.getFiles().filter(file => imageExtensions.includes(file.extension.toLowerCase()));
        return Promise.all(files.map(file => this.convertToBase64(file)));
    }

    async convertToBase64(file) {
        const base64String = await readAndConvertImage(this.app, file);
        const src = `data:image/${file.extension};base64,${base64String}`;
        return { src, data: base64String };
    }

    setImageAsBackground(base64) {
        setBackground(base64, 'png', this.app);
        this.close();
    }
}

class Background extends obsidian.Plugin {
    async onload() {
        await this.loadSettings();
    
        this.addSettingTab(new SettingTab(this.app, this));

        this.addCommand({
            id: 'set-background-image',
            name: 'Set Background Image',
            callback: () => {
                new ImageBackgroundModal(this.app).open();
            }
        });

        this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
            if (file instanceof obsidian.TFile && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp'].includes(file.extension.toLowerCase())) {
                menu.addItem((item) => {
                    item.setTitle('Set as Background Image')
                        .setIcon('image-file')
                        .onClick(() => {
                            this.setAsBackground(file);
                        });
                });
            }
        }));

        this.registerEvent(this.app.workspace.on('editor-menu', (menu, editor, view) => {
            if (view.file && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp'].includes(view.file.extension.toLowerCase())) {
                menu.addItem((item) => {
                    item.setTitle('Set as Canvas Background')
                        .setIcon('image-file')
                        .onClick(() => {
                            this.setAsBackground(view.file);
                        });
                });
            }
        }));
        
        this.registerEvent(this.app.workspace.on('layout-ready', async () => {
            if (this.settings.background) {
                const { base64String, extension } = this.settings.background;
                setBackground(base64String, extension, this.app);
            }
        }));
        
        if (this.settings.background) {
            const { base64String, extension } = this.settings.background;
            setBackground(base64String, extension, this.app);
        }
        
        this.registerEvent(this.app.workspace.on('settings', (settings) => {
            if (settings.plugin.id === this.manifest.id) {
                if (this.settings.background) {
                    const { base64String, extension } = this.settings.background;
                    setBackground(base64String, extension, this.app);
                }
            }
        }));
    }

    async setAsBackground(file) {
        try {
            const base64String = await readAndConvertImage(this.app, file);
            setBackground(base64String, file.extension);
        } catch (error) {
            console.error('Error setting background:', error);
        }
    }
}


class SettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Background Settings'});
        const cssInput = containerEl.createEl('textarea', {text: this.plugin.settings.css || ''});
        cssInput.style.width = '100%';
        cssInput.style.height = '200px';
        cssInput.style.marginBottom = '10px';
        cssInput.style.padding = '10px';
        cssInput.style.fontFamily = 'monospace';
        cssInput.style.fontSize = '14px';
        cssInput.style.border = '1px solid #ccc';
        cssInput.style.borderRadius = '5px';
        cssInput.style.resize = 'none';
        
        
        
        cssInput.oninput = () => {
            this.plugin.settings.css = cssInput.value;
            this.plugin.saveSettings(); 
        };
    }
}


Background.prototype.settings = {
    css: ''
};

// Method to load the plugin settings
Background.prototype.loadSettings = async function() {
    this.settings = Object.assign({}, await this.loadData());
};

// Method to save the plugin settings
Background.prototype.saveSettings = async function() {
    await this.saveData(this.settings);
};

module.exports = Background;
