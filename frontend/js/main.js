document.addEventListener('DOMContentLoaded', function () {
    const fileUploader = document.getElementById('fileUploader');
    const fileInput = document.getElementById('fileInput');
    const errorMessage = document.getElementById('errorMessage');

    const fileInfo = document.getElementById('fileInfo');
    const emptyState = document.getElementById('emptyState');

    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');

    const clearFileBtn = document.getElementById('clearFileBtn');
    const uploadFileBtn = document.getElementById('upload-file-btn');

    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    let currentFile = null;

    const acceptedVideoTypes = [
        'video/mp4',              // MP4
        'video/quicktime',        // MOV
        'video/x-ms-wmv',         // WMV
        'video/x-msvideo',        // AVI
        'video/x-ms-wm',          // AVCHD
        'video/x-flv',            // FLV
        'application/x-shockwave-flash', // SWF
        'video/mp4',              // F4V
        'video/x-matroska',       // MKV
        'video/webm'              // WEBM
    ];

    // Проверка, является ли файл видео
    function isVideoFile(file) {
        return acceptedVideoTypes.includes(file.type);
    }

    // Функция для форматирования размера файла
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Установка файла
    function setFile(file) {
        currentFile = file;

        if (file) {
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            fileType.textContent = file.type;

            fileInfo.style.display = 'flex';
            emptyState.style.display = 'none';

            fileUploader.classList.add('has-file');
            fileInfo.classList.add('anim');
            uploadFileBtn.disabled = false;

            console.log("Файл:", file);
            console.log("Тип файла:", file.type);
            console.log("Размер файла:", file.size);
        } else {
            fileInfo.style.display = 'none';
            emptyState.style.display = 'block';
            fileUploader.classList.remove('has-file');
            uploadFileBtn.disabled = true;
            hideProgressBar();
            setError('');
        }
    }

    // Установка сообщения об ошибке
    function setError(message) {
        if (message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('visible');
            fileUploader.classList.add('has-error');

            fileUploader.classList.add('shake');

            setTimeout(() => {
                fileUploader.classList.remove('shake');
            }, 600);
        } else {
            errorMessage.textContent = '';
            errorMessage.classList.remove('visible');
            fileUploader.classList.remove('has-error');
        }
    }

    // Показать прогресс-бар
    function showProgressBar() {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }

    // Скрыть прогресс-бар
    function hideProgressBar() {
        progressContainer.style.display = 'none';
    }

    // Обновить прогресс-бар
    function updateProgressBar(percent) {
        progressBar.style.width = percent + '%';
        progressText.textContent = percent + '%';
    }

    // Загрузка файла
    async function uploadFile() {
        if (!currentFile) {
            setError('Выберите файл для загрузки');
            return;
        }

        uploadFileBtn.disabled = true;
        clearFileBtn.disabled = true;
        showProgressBar();
        setError('');

        try {
            const title = encodeURIComponent(currentFile.name);
            const description = encodeURIComponent('здесь что то должно быть'); //!IMPORTANT Добавить описание(хз какое)

            const url = `http://localhost:3001/videos/upload?title=${title}&description=${description}`;

            const formData = new FormData();
            formData.append('file', currentFile);

            const config = {
                headers: {
                },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        updateProgressBar(percentCompleted);
                    }
                }
            };

            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post(url, formData, config);

            updateProgressBar(100);

            setTimeout(() => {
                alert(`Видео успешно загружено! ID: ${response.data.id}`);
                setFile(null);
                fileInput.value = '';
                hideProgressBar();
            }, 500);

        } catch (error) {
            let errorMsg = 'Ошибка при загрузке видео';

            if (error.response) {
                console.error('Ошибка от сервера:', error.response);
                errorMsg = error.response.data.detail || `Ошибка сервера (${error.response.status})`;
            } else if (error.request) {
                console.error('Нет ответа от сервера:', error.request);
                errorMsg = 'Нет ответа от сервера';
            } else {
                console.error('Ошибка настройки запроса:', error.message);
                errorMsg = `Ошибка запроса: ${error.message}`;
            }

            setError(errorMsg);
            hideProgressBar();
        } finally {
            uploadFileBtn.disabled = false;
            clearFileBtn.disabled = false;
        }
    }

    // Обработчик выбора файла через input
    function handleFileChange(e) {
        setError('');
        const selectedFile = e.target.files[0];

        if (selectedFile) {
            if (isVideoFile(selectedFile)) {
                setFile(selectedFile);
            } else {
                setError('Пожалуйста, загрузите только видеофайл');
                fileInput.value = '';
            }
        }
    }

    // Очистка файла
    function clearFile(e) {
        e.stopPropagation();
        setFile(null);
        fileInput.value = '';
    }

    // Обработчики Drag and Drop
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploader.classList.add('dragover', 'pulsing');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploader.classList.remove('dragover', 'pulsing');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        fileUploader.classList.remove('dragover', 'pulsing');
        setError('');

        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            const droppedFile = droppedFiles[0];

            if (isVideoFile(droppedFile)) {
                setFile(droppedFile);
            } else {
                setError('Пожалуйста, загрузите только видеофайл');
            }
        }
    }

    // Обработчик клика по области
    function handleFileSelect() {
        fileInput.click();
    }

    // Инициализация событий
    fileInput.addEventListener('change', handleFileChange);

    clearFileBtn.addEventListener('click', clearFile);
    uploadFileBtn.addEventListener('click', uploadFile);

    fileUploader.addEventListener('click', handleFileSelect);
    fileUploader.addEventListener('dragenter', handleDragEnter);
    fileUploader.addEventListener('dragover', handleDragOver);
    fileUploader.addEventListener('dragleave', handleDragLeave);
    fileUploader.addEventListener('drop', handleDrop);

    uploadFileBtn.disabled = true;
    hideProgressBar();
});