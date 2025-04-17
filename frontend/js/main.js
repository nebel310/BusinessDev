//TODO Добавить логику проверки статуса обработки видео

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
    let videoId = null;
    let hlsUrl = null;

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
    function updateCircularProgress(percent, status) {
        const progressBar = document.querySelector('.progress-bar');
        const percentElement = document.querySelector('.percent');
        const statusElement = document.querySelector('.status');

        if (status) {
            statusElement.textContent = status;
        } else if (percent === 100) {
            statusElement.textContent = 'Загрузка завершена';
        } else if (percent === 95) {
            statusElement.textContent = 'Обработка видео';
        } else if (percent > 0) {
            statusElement.textContent = 'Загрузка на сервер';
        }

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

    // Добавляем функцию для создания селектора качества
    function createQualitySelector(hls) {
        // Создаём контейнер селектора качества
        const qualityContainer = document.createElement('div');
        qualityContainer.className = 'quality-selector-container';

        // Создаём кнопку для показа/скрытия списка качества
        const qualityButton = document.createElement('button');
        qualityButton.className = 'quality-button';
        qualityButton.innerHTML = '<span>Качество</span> <span class="quality-arrow">▼</span>';

        // Создаём выпадающий список качества
        const qualityList = document.createElement('div');
        qualityList.className = 'quality-list';
        qualityList.style.display = 'none';

        // Добавляем элементы в контейнер
        qualityContainer.appendChild(qualityButton);
        qualityContainer.appendChild(qualityList);

        // Обработчик для открытия/закрытия списка качества
        qualityButton.addEventListener('click', () => {
            if (qualityList.style.display === 'none') {
                qualityList.style.display = 'block';
            } else {
                qualityList.style.display = 'none';
            }
        });

        // Закрытие списка при клике вне его
        document.addEventListener('click', (event) => {
            if (!qualityContainer.contains(event.target)) {
                qualityList.style.display = 'none';
            }
        });

        return { qualityContainer, qualityList };
    }

    // Обновляем функцию playVideoHLS для добавления выбора качества
    function playVideoHLS(videoId) {
        const videoElement = document.getElementById('video-player');
        const videoContainer = document.getElementById('video-container');

        console.log(hlsUrl);

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(hlsUrl);
            hls.attachMedia(videoElement);

            // Создаём и добавляем селектор качества
            const { qualityContainer, qualityList } = createQualitySelector(hls);
            videoContainer.appendChild(qualityContainer);

            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                console.log("HLS манифест загружен");

                // Получаем доступные качества
                const availableQualities = hls.levels.map((level) => ({
                    height: level.height,
                    width: level.width,
                    bitrate: level.bitrate,
                    name: getQualityName(level.height)
                }));

                console.log("Доступные качества:", availableQualities);

                // Добавляем авто-качество
                const autoQuality = document.createElement('div');
                autoQuality.className = 'quality-item active';
                autoQuality.textContent = 'Авто';
                autoQuality.dataset.levelIndex = -1;
                qualityList.appendChild(autoQuality);

                // Обработчик для авто-качества
                autoQuality.addEventListener('click', () => {
                    hls.currentLevel = -1; // -1 это авто-выбор
                    updateActiveQuality(-1);
                    qualityList.style.display = 'none';
                });

                // Добавляем все доступные качества
                availableQualities.forEach((quality, index) => {
                    const qualityItem = document.createElement('div');
                    qualityItem.className = 'quality-item';
                    qualityItem.textContent = quality.name;
                    qualityItem.dataset.levelIndex = index;

                    qualityItem.addEventListener('click', () => {
                        hls.currentLevel = index;
                        updateActiveQuality(index);
                        qualityList.style.display = 'none';
                    });

                    qualityList.appendChild(qualityItem);
                });

                // Функция для обновления активного качества
                function updateActiveQuality(index) {
                    // Убираем активный класс со всех элементов
                    const items = qualityList.querySelectorAll('.quality-item');
                    items.forEach(item => item.classList.remove('active'));

                    // Добавляем активный класс к выбранному элементу
                    const selectedItem = qualityList.querySelector(`[data-level-index="${index}"]`);
                    if (selectedItem) {
                        selectedItem.classList.add('active');

                        // Обновляем текст на кнопке
                        const buttonText = selectedItem.textContent;
                        qualityButton.querySelector('span').textContent = buttonText;
                    }
                }
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, function (event, data) {
                const levelIndex = data.level;
                console.log("Качество изменено на:", levelIndex);

                // Обновляем активное качество в селекторе
                const items = qualityList.querySelectorAll('.quality-item');
                items.forEach(item => item.classList.remove('active'));

                const selectedItem = qualityList.querySelector(`[data-level-index="${levelIndex}"]`);
                if (selectedItem) {
                    selectedItem.classList.add('active');

                    // Обновляем текст на кнопке
                    const buttonText = selectedItem.textContent;
                    qualityButton.querySelector('span').textContent = buttonText;
                }
            });

            hls.on(Hls.Events.ERROR, function (event, data) {
                console.error("Ошибка HLS:", data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error("Сетевая ошибка");
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error("Ошибка медиа");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("Критическая ошибка, воспроизведение невозможно");
                            break;
                    }
                }
            });
        }
        else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = hlsUrl;
            videoElement.addEventListener('loadedmetadata', function () {
                console.log("Видео загружено");
                // Примечание: на Safari/iOS нет API для выбора качества в HLS
                // Для этих браузеров селектор качества не будет работать
            });
        } else {
            console.error("Ваш браузер не поддерживает HLS");
        }
    }

    // Функция для преобразования высоты в понятное название качества
    function getQualityName(height) {
        if (!height) return "Неизвестно";

        if (height <= 240) return "240p";
        if (height <= 360) return "360p";
        if (height <= 480) return "480p";
        if (height <= 720) return "720p";
        if (height <= 1080) return "1080p";
        if (height <= 1440) return "2K";
        if (height <= 2160) return "4K";

        return `${height}p`;
    }

    async function getHlsUrl(id) {
        hlsUrl = `http://localhost:3001/videos/${id}/hls/master.m3u8`;
        console.log("HLS URL готов:", hlsUrl);
        return hlsUrl;
    }

    // Add a global flag to track if status checking is already in progress
    let isCheckingStatus = false;

    async function checkVideoProcessingStatus(id) {
        if (isCheckingStatus) return;

        try {
            isCheckingStatus = true;
            const token = localStorage.getItem('access_token');

            // Clear any existing interval before creating a new one
            if (processingInterval) {
                clearInterval(processingInterval);
            }

            processingInterval = setInterval(async () => {
                try {
                    const response = await axios.get(`http://localhost:3001/videos/${id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    console.log("Статус видео:", response.data);

                    if (response.data.status === 'processed') {
                        clearInterval(processingInterval);
                        processingInterval = null;
                        isCheckingStatus = false;
                        updateCircularProgress(100, 'Обработка завершена');

                        // Only get HLS URL once
                        if (!hlsUrl) {
                            await getHlsUrl(id);

                            setTimeout(() => {
                                successDialog.showModal();
                                playVideoHLS(id);
                            }, 1000);
                        }
                    }
                } catch (error) {
                    console.error('Ошибка при проверке статуса видео:', error);
                    clearInterval(processingInterval);
                    processingInterval = null;
                    isCheckingStatus = false;
                }
            }, 10000);
        } catch (error) {
            console.error('Ошибка при создании интервала проверки:', error);
            clearInterval(processingInterval);
            processingInterval = null;
            isCheckingStatus = false;

            let errorTitle = 'Ошибка проверки статуса';
            let errorMsg = 'Не удалось проверить статус обработки видео.';

            if (error.response) {
                errorMsg = error.response.data.detail || `Ошибка сервера (${error.response.status})`;
            }

            showErrorDialog(errorTitle, errorMsg);
        }
    }

    // Запуск процесса обработки видео
    async function processVideo(id) {
        try {
            const token = localStorage.getItem('access_token');

            updateCircularProgress(75, 'Запуск обработки видео');

            const response = await axios.post(`http://localhost:3001/videos/${id}/process`, {}, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log("Обработка запущена:", response.data);

            updateCircularProgress(80, 'Ожидание обработки видео');

            await checkVideoProcessingStatus(id);

        } catch (error) {
            console.error('Ошибка при запуске обработки видео:', error);

            let errorTitle = 'Ошибка обработки';
            let errorMsg = 'Не удалось начать обработку видео.';

            if (error.response) {
                errorMsg = error.response.data.detail || `Ошибка сервера (${error.response.status})`;
            }

            showErrorDialog(errorTitle, errorMsg);
        }
    }

    // Загрузка файла
    async function uploadFile() {
        if (!localStorage.getItem('access_token')) {
            showErrorDialog('Необходимо авторизоваться', 'Пожалуйста, войдите в систему, чтобы загрузить видео.');
            return
        }

        uploadFileBtn.disabled = true;
        clearFileBtn.disabled = true;

        showCircularProgress();
        await transformToCicle();

        setError('');

        try {
            const title = encodeURIComponent(currentFile.name);
            const description = encodeURIComponent('здесь что то должно быть');
            //! Заменить описание

            const url = `http://localhost:3001/videos/upload?title=${title}&description=${description}`;

            const formData = new FormData();
            formData.append('file', currentFile);

            const config = {
                headers: {},
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 70) / progressEvent.total
                        );
                        updateCircularProgress(percentCompleted, 'Загрузка на сервер');
                    }
                }
            };

            const token = localStorage.getItem('access_token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post(url, formData, config);

            videoId = response.data.id;
            console.log("Видео загружено, ID:", videoId);

            // Запуск обработки
            await processVideo(videoId);

            // updateCircularProgress(100);

            // try {
            //     await checkStatusVideo(videoId);

            //     // setTimeout(() => successDialog.showModal(), 2000);
            //     //TODO Тут всплыть окно после успешной обработки видео

            // } catch (error) {
            //     console.error('Ошибка при проверке статуса:', error);
            //     setFile(null);
            //     fileInput.value = '';
            // }

        } catch (error) {
            let errorTitle = 'Ошибка при загрузке файла';
            let errorMsg = 'Возможно файл был поврежден. Попробуйте еще раз или загрузите другой файл.';

            if (error.response) {
                console.error('Ошибка от сервера:', error.response);
                errorTitle = 'Ошибка сервера';
                // errorMsg = error.response.data.detail || `Ошибка сервера (${error.response.status})`;
            } else if (error.request) {
                console.error('Нет ответа от сервера:', error.request);
                errorTitle = 'Нет ответа от сервера';
                errorMsg = 'Сервер недоступен. Пожалуйста, попробуйте позже.';
            } else {
                console.error('Ошибка настройки запроса:', error.message);
                // errorMsg = `Ошибка запроса: ${error.message}`;
            }

            showErrorDialog(errorTitle, errorMsg);
            // setError(errorMsg);
            // hideCircularProgress();
        } finally {
            uploadFileBtn.disabled = false;
            clearFileBtn.disabled = false;
        }
    }

    // отображение диалога с ошибкой
    function showErrorDialog(title, message) {
        const errorDialog = document.getElementById('error-dialog');
        const dialogTitle = errorDialog.querySelector('h2');
        const dialogMessage = errorDialog.querySelector('.error-info p');

        dialogTitle.textContent = title;
        dialogMessage.textContent = message;

        if (title === "Необходимо авторизоваться") {
            const actionButton = errorDialog.querySelector('#back-btn');

            const newButton = actionButton.cloneNode(true);
            actionButton.parentNode.replaceChild(newButton, actionButton);

            newButton.textContent = "Вход";
            newButton.addEventListener('click', () => {
                document.getElementById('login-dialog').showModal();
                errorDialog.close();
            });
        }

        errorDialog.showModal();
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

    uploadFileBtn.disabled = true;
    // hideProgressBar();
});