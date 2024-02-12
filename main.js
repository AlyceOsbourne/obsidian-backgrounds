const obsidian = require('obsidian');

class ImageBackgroundModal extends obsidian.Modal {
    constructor(app) {
        super(app);
        this.app = app;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty(); // Clear existing content
        contentEl.createEl('h3', {text: 'Select an Image as Background'});

        // Style the modal for larger size
        contentEl.style.maxWidth = '80vw';
        contentEl.style.maxHeight = '80vh';
        contentEl.style.width = 'auto';
        contentEl.style.height = 'auto';

        // Container for image cards
        const container = contentEl.createDiv();
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.overflowY = 'auto';
        container.style.gap = '20px'; // Space between cards
        container.style.padding = '20px'; // Padding inside the container

        this.loadImages().then(images => {
            images.forEach(image => {
                // Create a card for each image
                const card = container.createDiv();
                card.style.padding = '10px';
                card.style.margin = '10px 0';
                card.style.border = '1px solid #ccc';
                card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                card.style.borderRadius = '5px';
                card.style.cursor = 'pointer';
                card.style.display = 'flex';
                card.style.justifyContent = 'center';

                const imgEl = card.createEl('img', {
                    attr: {
                        src: image.src,
                        style: 'max-width: 100%; max-height: 60vh;' // Adjust image size within the card
                    }
                });

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
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function() {
                const base64 = btoa(reader.result);
                const src = `data:image/${file.extension};base64,${base64}`;
                resolve({ src, data: base64 });
            };
            reader.onerror = reject;
            this.app.vault.readBinary(file).then(data => {
                const blob = new Blob([data], {type: `image/${file.extension}`});
                reader.readAsBinaryString(blob);
            }).catch(reject);
        });
    }

    setImageAsBackground(base64) {
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.style.backgroundImage = `url("data:image/png;base64,${base64}")`;
            canvasWrapper.style.backgroundSize = 'cover';
            canvasWrapper.style.backgroundPosition = 'center';
        }
        this.close();
    }
}

class Background extends obsidian.Plugin {
    async onload() {
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
    }

    async setAsBackground(file) {
        try {
            const data = await this.app.vault.readBinary(file);
            const blob = new Blob([data], {type: `image/${file.extension}`});
            const reader = new FileReader();
            
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                const canvasWrapper = document.querySelector('.canvas-wrapper');
                if (canvasWrapper) {
                    canvasWrapper.style.backgroundImage = `url("data:image/${file.extension};base64,${base64String}")`;
                    canvasWrapper.style.backgroundSize = 'cover';
                    canvasWrapper.style.backgroundPosition = 'center';
                }
            };
            
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error setting background:', error);
        }
    }

}

module.exports = Background;