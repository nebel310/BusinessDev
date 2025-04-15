//TODO Добавить логику проверки статуса обработки видео
//TODO Добавить ошибку в диалоговое окно - "ошибка сервера"
//!BUG баг с refresh - "POST /auth/refresh HTTP/1.1" 422 Unprocessable Content
//!BUG при нажатии enter в диалоговом окне, закрывает окно, должно сабмитить

document.addEventListener('DOMContentLoaded', function () {
    const fileUploader = document.getElementById('fileUploader');
    const fileInput = document.getElementById('fileInput');
    const errorMessage = document.getElementById('errorMessage');

    const fileInfo = document.getElementById('fileInfo');
    const emptyState = document.getElementById('emptyState');
    const uploadingState = document.getElementById('uploadingState');

    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileType = document.getElementById('fileType');

    const clearFileBtn = document.getElementById('clearFileBtn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    // const selectFileBtn = document.getElementById('select-file-btn');

    let currentFile = null;
    let processingInterval = null;

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
            uploadFileBtn.classList.remove('hidden');

            fileUploader.removeEventListener('dragleave', handleDragLeave);
            fileUploader.removeEventListener('dragenter', handleDragEnter);
            fileUploader.removeEventListener('dragover', handleDragOver);
            fileUploader.removeEventListener('drop', handleDrop);

            console.log("Файл:", file);
            console.log("Тип файла:", file.type);
            console.log("Размер файла:", file.size);
        } else {
            fileInfo.style.display = 'none';
            emptyState.style.display = 'block';
            fileUploader.classList.remove('has-file');
            uploadFileBtn.disabled = true;
            uploadFileBtn.classList.add('hidden');
            // hideProgressBar();
            setError('');

            initDndListeners();
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

    // Прогресс бар
    function updateCircularProgress(percent) {
        const progressBar = document.querySelector('.progress-bar');
        const percentElement = document.querySelector('.percent');
        const statusElement = document.querySelector('.status');

        let radius;
        if (window.matchMedia('(max-width: 700px)').matches) {
            radius = 78;
        } else {
            radius = 140;
        }

        const circumference = 2 * Math.PI * radius;

        const offset = circumference * (1 - (percent / 100));

        progressBar.style.strokeDasharray = `${circumference}`;
        progressBar.style.strokeDashoffset = offset;

        percentElement.textContent = `${Math.round(percent)}%`;

        if (percent === 100) {
            statusElement.textContent = 'Загрузка завершена';
        } else if (percent === 95) {
            statusElement.textContent = 'Обработка видео';
        } else if (percent > 0) {
            statusElement.textContent = 'Загрузка на сервер';
        }
    }

    function showCircularProgress() {
        const uploadingState = document.getElementById('uploadingState');
        uploadingState.classList.remove('hidden');


        updateCircularProgress(0);
    }

    function hideCircularProgress() {
        const uploadingState = document.getElementById('uploadingState');
        uploadingState.classList.add('hidden');
    }

    // Проверка статуса обработки видео
    async function checkStatusVideo(videoId) {
        //* Логика проверки статуса
        console.log("Проверка статуса...");
    }

    // Загрузка файла
    async function uploadFile() {
        uploadFileBtn.disabled = true;
        clearFileBtn.disabled = true;

        showCircularProgress();
        await transformToCicle();

        setError('');

        //! Проверка на авторизацию должна быть, кастомная ошибка

        try {
            const title = encodeURIComponent(currentFile.name);
            const description = encodeURIComponent('здесь что то должно быть');
            //! Заменить описание

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
                        updateCircularProgress(Math.max(0, percentCompleted - 5));
                    }
                }
            };

            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post(url, formData, config);

            const videoId = response.data.id;
            console.log(response);

            // updateCircularProgress(100);

            setTimeout(() => successDialog.showModal(), 1000);

            try {
                await checkStatusVideo(videoId);

                //TODO Тут всплыть окно после успешной обработки видео

            } catch (error) {
                console.error('Ошибка при проверке статуса:', error);
                setFile(null);
                fileInput.value = '';
            }

        } catch (error) {
            let errorMsg = 'Ошибка при загрузке видео';
            errorDialog.showModal();

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
            hideCircularProgress();
        } finally {
            uploadFileBtn.disabled = false;
            clearFileBtn.disabled = false;
        }
    }

    async function transformToCicle() {
        fileInfo.style.display = 'none';
        uploadFileBtn.classList.add('hidden');
        fileUploader.classList.remove('has-file');
        fileUploader.classList.add('uploading');
        uploadingState.classList.remove('hidden');
        await new Promise(resolve => setTimeout(resolve, 1000));
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

    let dragCounter = 0;

    // Обработчики dnd
    function handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        console.log("enter");
        if (dragCounter === 1) {
            fileUploader.classList.add('dragover', 'pulsing');
        }
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("over");
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        console.log("leave");
        if (dragCounter === 0) {
            fileUploader.classList.remove('dragover', 'pulsing');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("drop");
        fileUploader.classList.remove('dragover', 'pulsing');
        setError('');

        dragCounter = 0

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
        if (!currentFile) {
            fileInput.click();
        }
    }

    function initDndListeners() {
        fileUploader.addEventListener('dragleave', handleDragLeave);
        fileUploader.addEventListener('dragenter', handleDragEnter);
        fileUploader.addEventListener('dragover', handleDragOver);
        fileUploader.addEventListener('drop', handleDrop);
    }

    // Инициализация событий
    fileInput.addEventListener('change', handleFileChange);

    clearFileBtn.addEventListener('click', clearFile);
    uploadFileBtn.addEventListener('click', uploadFile);

    fileUploader.addEventListener('click', handleFileSelect);
    initDndListeners();

    // Окна с успехом/ошибкой
    const successDialog = document.getElementById('success-dialog');
    const errorDialog = document.getElementById('error-dialog');

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', reset)
    })

    function reset() {
        currentFile = null;
        fileInput.value = '';

        if (processingInterval) {
            clearInterval(processingInterval);
            processingInterval = null;
        }

        if (successDialog && typeof successDialog.close === 'function') {
            successDialog.close();
        }
        if (errorDialog && typeof errorDialog.close === 'function') {
            errorDialog.close();
        }

        fileInfo.style.display = 'none';
        emptyState.style.display = 'block';
        uploadingState.classList.add('hidden');

        fileUploader.classList.remove('has-file', 'has-error', 'uploading');
        uploadFileBtn.disabled = true;
        uploadFileBtn.classList.add('hidden');
        clearFileBtn.disabled = false;

        setError('');

        hideCircularProgress();

        initDndListeners();

        dragCounter = 0;
    }

    function hideProgressBar() {
        hideCircularProgress();
    }

    uploadFileBtn.disabled = true;
    // hideProgressBar();
});