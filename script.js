class BookLibrary {
    constructor() {
        this.books = [];
        this.currentEditId = null;
        this.initialized = false;
        this.csvFile = "lib.csv";

        try {
            this.init();
            this.initialized = true;
        } catch (error) {
            console.error("Ошибка инициализации приложения:", error.message);
            this.showError("Не удалось инициализировать приложение");
        }
    }

    async init() {
        await this.loadFromCSV();
        this.setupEventListeners();
        this.renderBooks();
        this.updateStats();
    }

    async loadFromCSV() {
        try {
            console.log("Загрузка CSV файла:", this.csvFile);
            const response = await fetch(this.csvFile);
            if (response.ok) {
                const csvText = await response.text();
                console.log("CSV содержимое получено, длина:", csvText.length);
                this.parseCSV(csvText);
                console.log("Книги после парсинга:", this.books);
                return;
            } else {
                console.error("Ошибка HTTP:", response.status);
                this.books = [];
            }
        } catch (error) {
            console.error("Ошибка загрузки CSV:", error);
            this.showError(error);
            this.books = [];
        }
    }

    parseCSV(csvText) {
        this.books = [];
        const lines = csvText.trim().split("\n");

        // Более точная проверка на заголовок
        const firstLine = lines[0].toLowerCase();
        const hasHeader =
            firstLine.includes("id") &&
            (firstLine.includes("title") || firstLine.includes("authors"));

        const startLine = hasHeader ? 1 : 0;

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = this.parseCSVLine(line);

            if (parts.length >= 9) {
                try {
                    // Убираем кавычки если они есть
                    const cleanParts = parts.map((part) => {
                        let cleaned = part.trim();
                        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                            cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
                        }
                        return cleaned;
                    });

                    const book = {
                        id: cleanParts[0] || Date.now().toString() + i,
                        title: cleanParts[1] || "Без названия",
                        authors: cleanParts[2]
                            ? cleanParts[2].split("|").map((a) => a.trim())
                            : ["Неизвестный автор"],
                        year: parseInt(cleanParts[3]) || new Date().getFullYear(),
                        edition: cleanParts[4] || "",
                        storage: {
                            name: cleanParts[5] || "Не указано",
                            path: cleanParts[6] || "",
                        },
                        isRead: cleanParts[7] === "true",
                        type: cleanParts[8] || "Другое",
                    };
                    this.books.push(book);
                } catch (error) {
                    console.error("Ошибка парсинга строки CSV:", line, error);
                }
            } else {
                console.warn("Пропущена некорректная строка CSV:", line);
            }
        }
        console.log("Загружено книг:", this.books.length);

        this.renderBooks();
        this.updateStats();

        return this.books;
    }

    parseCSVLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;
        let escapeNext = false;

        for (const element of line) {
            const char = element;

            if (escapeNext) {
                current += char;
                escapeNext = false;
            } else if (char === "\\") {
                escapeNext = true;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                result.push(current);
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    async saveToCSV() {
        try {
            // Создаем CSV содержимое
            const headers = [
                "id",
                "title",
                "authors",
                "year",
                "edition",
                "storage_name",
                "storage_path",
                "isRead",
                "type",
            ];
            const csvLines = [headers.join(",")];

            this.books.forEach((book) => {
                const row = [
                    book.id,
                    `"${book.title.replaceAll('"', '""')}"`,
                    `"${book.authors.join("|").replaceAll('"', '""')}"`,
                    book.year,
                    `"${(book.edition || "").replaceAll('"', '""')}"`,
                    `"${book.storage.name.replaceAll('"', '""')}"`,
                    `"${book.storage.path.replaceAll('"', '""')}"`,
                    book.isRead ? "true" : "false",
                    `"${book.type.replaceAll('"', '""')}"`,
                ];
                csvLines.push(row.join(","));
            });

            const csvContent = csvLines.join("\n");

            // Сохраняем файл на сервер (этот код будет работать на сервере)
            // Для Яндекс.Диска потребуется дополнительная настройка
            console.log("CSV данные для сохранения:", csvContent);

            // Показываем пользователю данные для ручного сохранения
            this.showCSVDownload(csvContent);
        } catch (error) {
            console.error("Ошибка сохранения CSV:", error);
            this.showNotification("Ошибка при сохранении данных", "error");
        }
    }

    showCSVDownload(csvContent) {
        // Создаем временную ссылку для скачивания
        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.setAttribute("download", this.csvFile);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.remove(link);

        this.showNotification(
            "Данные готовы для сохранения. Файл будет скачан.",
            "success"
        );
    }

    setupEventListeners() {
        const form = document.getElementById('book-form');
        const cancelBtn = document.getElementById('cancel-btn');
        const searchInput = document.getElementById('search-input');
        const filterType = document.getElementById('filter-type');
        const filterRead = document.getElementById('filter-read');
        const importInput = document.getElementById("import-file");

        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        cancelBtn.addEventListener('click', () => this.cancelEdit());
        searchInput.addEventListener('input', () => this.renderBooks());
        filterType.addEventListener('change', () => this.renderBooks());
        filterRead.addEventListener('change', () => this.renderBooks());
        importInput.addEventListener("change", (e) => this.importData(e));
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const bookData = {
            id: this.currentEditId || Date.now().toString(),
            title: document.getElementById("title").value,
            authors: document
                .getElementById("authors")
                .value.split(",")
                .map((a) => a.trim()),
            year: parseInt(document.getElementById("year").value),
            edition: document.getElementById("edition").value,
            storage: {
                name: document.getElementById("storage-name").value,
                path: document.getElementById("storage-path").value,
            },
            isRead: document.getElementById("is-read").checked,
            type: document.getElementById("book-type").value,
        };

        if (this.currentEditId) {
            await this.updateBook(bookData);
            this.showNotification("Книга успешно обновлена!", "success");
        } else {
            await this.addBook(bookData);
            this.showNotification("Книга успешно добавлена!", "success");
        }

        this.resetForm();
        this.renderBooks();
        this.updateStats();
    }

    async addBook(book) {
        this.books.push(book);
        await this.saveToCSV();
    }

    async updateBook(updatedBook) {
        const index = this.books.findIndex(
            (book) => book.id === this.currentEditId
        );
        if (index !== -1) {
            this.books[index] = updatedBook;
            await this.saveToCSV();
        }
        this.currentEditId = null;
    }

    async deleteBook(id) {
        if (confirm("Вы уверены, что хотите удалить эту книгу?")) {
            this.books = this.books.filter((book) => book.id !== id);
            await this.saveToCSV();
            this.renderBooks();
            this.updateStats();
            this.showNotification("Книга удалена!", "success");
        }
    }

    editBook(id) {
        const book = this.books.find((b) => b.id === id);
        if (book) {
            this.currentEditId = id;

            document.getElementById("title").value = book.title;
            document.getElementById("authors").value = book.authors.join(", ");
            document.getElementById("year").value = book.year;
            document.getElementById("edition").value = book.edition || "";
            document.getElementById("storage-name").value = book.storage.name;
            document.getElementById("storage-path").value = book.storage.path;
            document.getElementById("book-type").value = book.type;
            document.getElementById("is-read").checked = book.isRead;

            document.getElementById("form-title").textContent =
                "Редактировать книгу";
            document.getElementById("submit-btn").textContent =
                "Сохранить изменения";
            document.getElementById("cancel-btn").style.display =
                "inline-block";

            document.getElementById("title").focus();
        }
    }

    cancelEdit() {
        this.currentEditId = null;
        this.resetForm();
    }

    resetForm() {
        document.getElementById("book-form").reset();
        document.getElementById("edit-id").value = "";
        document.getElementById("form-title").textContent =
            "Добавить новую книгу";
        document.getElementById("submit-btn").textContent = "Добавить книгу";
        document.getElementById("cancel-btn").style.display = "none";
    }

    getFilteredBooks() {
        const searchTerm = document
            .getElementById("search-input")
            .value.toLowerCase();
        const typeFilter = document.getElementById("filter-type").value;
        const readFilter = document.getElementById("filter-read").value;

        return this.books.filter((book) => {
            const matchesSearch =
                book.title.toLowerCase().includes(searchTerm) ||
                book.authors.some((author) =>
                    author.toLowerCase().includes(searchTerm)
                );

            const matchesType = !typeFilter || book.type === typeFilter;

            const matchesRead =
                !readFilter ||
                (readFilter === "read" && book.isRead) ||
                (readFilter === "unread" && !book.isRead);

            return matchesSearch && matchesType && matchesRead;
        });
    }

    renderBooks() {
        console.log("Рендеринг книг, всего:", this.books.length);

        const booksList = document.getElementById("books-list");
        const filteredBooks = this.getFilteredBooks();

        console.log("Отфильтровано:", filteredBooks.length);

        booksList.innerHTML =
            filteredBooks.length === 0
                ? '<tr><td colspan="7" style="text-align: center; padding: 20px;">Книги не найдены</td></tr>'
                : filteredBooks
                    .map(
                        (book) => `
                        <tr>
                            <td>${this.escapeHtml(book.title)}</td>
                            <td>${this.escapeHtml(book.authors.join(", "))}</td>
                            <td>${book.year}</td>
                            <td>${this.escapeHtml(book.type)}</td>
                            <td><span class="read-status ${book.isRead ? "read-true" : "read-false"
                            }">
                                ${book.isRead ? "Прочитана" : "Не прочитана"}
                            </span></td>
                            <td title="${this.escapeHtml(book.storage.path)}">
                                ${this.escapeHtml(book.storage.name)}
                            </td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn-edit" onclick="library.editBook('${book.id
                            }')">
                                        ✏️ Редактировать
                                    </button>
                                    <button class="btn-delete" onclick="library.deleteBook('${book.id
                            }')">
                                        🗑️ Удалить
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `
                    )
                    .join("");
    }

    updateStats() {
        const total = this.books.length;
        const read = this.books.filter((book) => book.isRead).length;
        const unread = total - read;

        document.getElementById("total-books").textContent = total;
        document.getElementById("read-books").textContent = read;
        document.getElementById("unread-books").textContent = unread;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Метод для отображения ошибок
    showError(message) {
        alert("Ошибка: " + message);
    }

    async exportData() {
        // Спросить пользователя о формате
        const format = confirm(
            "Экспортировать в CSV? (OK - CSV, Cancel - JSON)"
        )
            ? "csv"
            : "json";

        if (format === "csv") {
            await this.saveToCSV();
        } else {
            this.exportToJSON();
        }
    }

    exportToJSON() {
        const data = JSON.stringify(this.books, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "book-library-backup.json";
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification("JSON данные экспортированы!", "success");
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileExtension = file.name.split(".").pop().toLowerCase();
                const fileContent = e.target.result;

                if (fileExtension === "csv") {
                    this.parseCSV(fileContent);
                    // После парсинга CSV конвертируем в наш формат
                    this.convertImportedCSVData();
                } else if (fileExtension === "json") {
                    const importedBooks = JSON.parse(fileContent);
                    if (Array.isArray(importedBooks)) {
                        this.books = importedBooks;
                    } else {
                        throw new Error("Invalid JSON format");
                    }
                } else {
                    throw new Error("Unsupported file format");
                }

                await this.saveToCSV();
                this.renderBooks();
                this.updateStats();
                this.showNotification("Данные успешно импортированы!", "success");
            } catch (error) {
                this.showNotification(
                    "Ошибка при импорте файла: " + error.message,
                    "error"
                );
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    }

    convertImportedCSVData() {
        this.books = this.books.map((book) => {
            // Убеждаемся, что authors - это массив
            if (typeof book.authors === "string") {
                book.authors = book.authors.split("|").map((a) => a.trim());
            }

            // Убеждаемся, что year - число
            if (typeof book.year === "string") {
                book.year = parseInt(book.year) || new Date().getFullYear();
            }

            // Убеждаемся, что isRead - boolean
            if (typeof book.isRead === "string") {
                book.isRead = book.isRead.toLowerCase() === "true";
            }

            return book;
        });
    }

    showNotification(message, type) {
        const notification = document.getElementById("notification");
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.className = "notification";
        }, 3000);
    }
}

// Инициализация библиотеки
let library;

document.addEventListener("DOMContentLoaded", function () {
    const library = new BookLibrary();
    window.library = library; // Делаем доступным глобально
});
