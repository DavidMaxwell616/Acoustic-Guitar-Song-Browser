export class SongBrowserScene extends Phaser.Scene {
    constructor() {
        super("SongBrowserScene");

        this.songData = null;
        this.flatSongs = [];
        this.filteredSongs = [];

        this.rowHeight = 78;
        this.scrollOffset = 0;
        this.maxScroll = 0;
        this.visibleRows = 0;

        this.ui = {};
        this.songCardObjects = [];

        this.searchInput = null;
        this.genreSelect = null;
        this.settingSelect = null;
        this.sortSelect = null;
        this.songCountEl = null;
    }

    preload() {
        this.load.json("songs", "assets/acoustic_guitar_songs.json");
    }

    create() {
        this.songData = this.cache.json.get("songs");

        this.searchInput = document.getElementById("searchInput");
        this.genreSelect = document.getElementById("genreSelect");
        this.settingSelect = document.getElementById("settingSelect");
        this.sortSelect = document.getElementById("sortSelect");
        this.songCountEl = document.getElementById("songCount");
        this.clearBtn = document.getElementById("clearBtn");
        this.flattenSongs();
        this.populateGenreDropdown();
        this.createLayout();
        this.installDomEvents();
        this.installSceneInput();
        this.applyFilters();

        this.scale.on("resize", this.handleResize, this);
    }

    flattenSongs() {
        this.flatSongs = [];

        for (const genre in this.songData) {
            for (const setting in this.songData[genre]) {
                const songs = this.songData[genre][setting];

                songs.forEach(song => {
                    this.flatSongs.push({
                        title: song.title || "",
                        artist: song.artist || "",
                        year: song.year || 0,
                        lyrics: song.lyrics || "",
                        chords: song.chords || "",
                        tab: song.tab || "",
                        genre,
                        setting,
                        links: this.buildLinks(song),
                    });
                });
            }
        }
    }

    populateGenreDropdown() {
        const genres = Object.keys(this.songData);

        genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre;
            option.textContent = this.prettyLabel(genre);
            this.genreSelect.appendChild(option);
        });
    }

    createLayout() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.cameras.main.setBackgroundColor("#111418");

        this.ui.listTop = 96;
        this.ui.listLeft = 16;
        this.ui.listWidth = w - 32;
        this.ui.listHeight = h - this.ui.listTop - 16;

        this.ui.listBg = this.add.rectangle(
            this.ui.listLeft,
            this.ui.listTop,
            this.ui.listWidth,
            this.ui.listHeight,
            0x151a21
        ).setOrigin(0).setStrokeStyle(1, 0x2e3946);

        this.ui.emptyText = this.add.text(w / 2, h / 2, "No songs found", {
            fontFamily: "Arial",
            fontSize: "24px",
            color: "#9aa6b5"
        }).setOrigin(0.5).setVisible(false);

        this.ui.helpText = this.add.text(w - 18, h - 14, "Mouse wheel or arrow keys to scroll", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#7f8b99"
        }).setOrigin(1, 1);
    }

    buildLinks(song) {
        const query = encodeURIComponent(`${song.title} ${song.artist}`);

        return {
            chords: `https://www.google.com/search?q=${query}+chords`,
            tabs: `https://www.google.com/search?q=${query}+guitar+tab`,
            lyrics: `https://www.google.com/search?q=${query}+lyrics`,
            ultimateGuitar: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${query}`,
            songsterr: `https://www.songsterr.com/a/wa/search?pattern=${query}`,
            chordify: `https://chordify.net/search/${query}`,
            genius: `https://genius.com/search?q=${query}`
        };
    }

    installDomEvents() {
        this.searchInput.addEventListener("input", () => {
            this.applyFilters();
        });

        this.genreSelect.addEventListener("change", () => {
            this.applyFilters();
        });

        this.settingSelect.addEventListener("change", () => {
            this.applyFilters();
        });

        this.sortSelect.addEventListener("change", () => {
            this.applyFilters();
        });

        this.clearBtn.addEventListener("click", () => {
            this.searchInput.value = "";
            this.genreSelect.value = "All";
            this.settingSelect.value = "All";
            this.sortSelect.value = "title";

            this.applyFilters();
        });
    }

    installSceneInput() {
        this.input.keyboard.on("keydown-UP", () => {
            this.scrollOffset = Math.max(0, this.scrollOffset - 1);
            this.drawSongs();
        });

        this.input.keyboard.on("keydown-DOWN", () => {
            this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 1);
            this.drawSongs();
        });

        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                this.scrollOffset = Math.min(this.maxScroll, this.scrollOffset + 1);
            } else if (deltaY < 0) {
                this.scrollOffset = Math.max(0, this.scrollOffset - 1);
            }
            this.drawSongs();
        });
    }

    applyFilters() {
        const search = this.searchInput.value.trim().toLowerCase();
        const genre = this.genreSelect.value;
        const setting = this.settingSelect.value;
        const sortBy = this.sortSelect.value;

        this.filteredSongs = this.flatSongs.filter(song => {
            const matchesSearch =
                !search ||
                song.title.toLowerCase().includes(search) ||
                song.artist.toLowerCase().includes(search);

            const matchesGenre = genre === "All" || song.genre === genre;
            const matchesSetting = setting === "All" || song.setting === setting;

            return matchesSearch && matchesGenre && matchesSetting;
        });

        this.filteredSongs.sort((a, b) => {
            if (sortBy === "year") {
                return a.year - b.year;
            }

            return String(a[sortBy]).localeCompare(String(b[sortBy]));
        });

        this.scrollOffset = 0;
        this.songCountEl.textContent = `${this.filteredSongs.length} songs`;
        this.drawSongs();
    }

    clearSongCards() {
        this.songCardObjects.forEach(obj => obj.destroy());
        this.songCardObjects.length = 0;
    }

    drawSongs() {
        this.clearSongCards();

        const w = this.scale.width;
        const h = this.scale.height;

        this.ui.listWidth = w - 32;
        this.ui.listHeight = h - this.ui.listTop - 16;
        this.ui.listBg.setSize(this.ui.listWidth, this.ui.listHeight);

        this.visibleRows = Math.max(1, Math.floor((this.ui.listHeight - 12) / this.rowHeight));
        this.maxScroll = Math.max(0, this.filteredSongs.length - this.visibleRows);
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, this.maxScroll);

        this.ui.emptyText.setPosition(w / 2, this.ui.listTop + this.ui.listHeight / 2);
        this.ui.emptyText.setVisible(this.filteredSongs.length === 0);
        this.ui.helpText.setPosition(w - 18, h - 14);

        const start = this.scrollOffset;
        const end = Math.min(this.filteredSongs.length, start + this.visibleRows);

        let y = this.ui.listTop + 8;

        for (let i = start; i < end; i++) {
            this.drawSongCard(this.filteredSongs[i], y);
            y += this.rowHeight;
        }

        if (this.filteredSongs.length > this.visibleRows) {
            const trackX = this.ui.listLeft + this.ui.listWidth - 10;
            const trackY = this.ui.listTop + 8;
            const trackH = this.ui.listHeight - 16;

            const thumbH = Math.max(36, trackH * (this.visibleRows / this.filteredSongs.length));
            const thumbY = trackY + (trackH - thumbH) * (this.scrollOffset / this.maxScroll);

            const track = this.add.rectangle(trackX, trackY, 4, trackH, 0x27303b).setOrigin(0);
            const thumb = this.add.rectangle(trackX - 2, thumbY, 8, thumbH, 0x7e8da1).setOrigin(0);

            this.songCardObjects.push(track, thumb);
        }
    }

    drawSongCard(song, y) {
        const x = this.ui.listLeft + 8;
        const width = this.ui.listWidth - 24;
        const height = 66;

        const bg = this.add.rectangle(x, y, width, height, 0x1d242d)
            .setOrigin(0)
            .setStrokeStyle(1, 0x313c49);

        const title = this.add.text(x + 14, y + 10, song.title, {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#f4f7fb",
            fontStyle: "bold"
        });

        const meta = this.add.text(x + 14, y + 39, `${song.artist} • ${song.year}`, {
            fontFamily: "Arial",
            fontSize: "15px",
            color: "#b4beca"
        });
        bg.setInteractive({ useHandCursor: true });

        bg.on("pointerdown", () => {
            this.showSongLinks(song);
        });
        const genreTag = this.createTag(x + width - 270, y + 14, this.prettyLabel(song.genre));
        const settingTag = this.createTag(x + width - 140, y + 14, this.prettyLabel(song.setting));

        this.songCardObjects.push(bg, title, meta, ...genreTag.objects, ...settingTag.objects);
    }
    showSongLinks(song) {
        const links = song.links;

        const w = this.scale.width;
        const h = this.scale.height;

        const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.7)
            .setOrigin(0)
            .setInteractive();

        const panel = this.add.rectangle(w / 2, h / 2, 420, 320, 0x1d242d)
            .setStrokeStyle(2, 0x4a5a6a);

        const title = this.add.text(w / 2, h / 2 - 130,
            `${song.title}\n${song.artist}`,
            { fontSize: "20px", align: "center" }
        ).setOrigin(0.5);

        const createLink = (label, url, y) => {
            const txt = this.add.text(w / 2, y, label, {
                fontSize: "16px",
                color: "#66ccff"
            })
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            txt.on("pointerdown", () => {
                window.open(url, "_blank");
            });

            return txt;
        };

        const startY = h / 2 - 40;

        const items = [
            ["Chords (Google)", links.chords],
            ["Tabs (Google)", links.tabs],
            ["Lyrics (Google)", links.lyrics],
            ["Ultimate Guitar", links.ultimateGuitar],
            ["Songsterr", links.songsterr],
            ["Chordify", links.chordify],
            ["Genius", links.genius]
        ];

        const objs = [overlay, panel, title];

        items.forEach((item, i) => {
            objs.push(createLink(item[0], item[1], startY + i * 28));
        });

        overlay.on("pointerdown", () => {
            objs.forEach(o => o.destroy());
        });
    }
    createTag(x, y, label) {
        const paddingX = 10;
        const paddingY = 5;

        const temp = this.add.text(0, 0, label, {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#eef3f8"
        });

        const width = temp.width + paddingX * 2;
        const height = temp.height + paddingY * 2;
        temp.destroy();

        const bg = this.add.rectangle(x, y, width, height, 0x394757).setOrigin(0);
        const text = this.add.text(x + paddingX, y + paddingY, label, {
            fontFamily: "Arial",
            fontSize: "13px",
            color: "#eef3f8"
        });

        return {
            objects: [bg, text]
        };
    }

    prettyLabel(value) {
        return String(value)
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    handleResize(gameSize) {
        const w = gameSize.width;
        const h = gameSize.height;

        this.ui.listWidth = w - 32;
        this.ui.listHeight = h - this.ui.listTop - 16;

        this.ui.listBg.setSize(this.ui.listWidth, this.ui.listHeight);
        this.ui.emptyText.setPosition(w / 2, this.ui.listTop + this.ui.listHeight / 2);
        this.ui.helpText.setPosition(w - 18, h - 14);

        this.drawSongs();
    }
}
