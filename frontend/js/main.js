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
        } else {
            fileInfo.style.display = 'none';
            emptyState.style.display = 'block';
            fileUploader.classList.remove('has-file');

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

    // Обработчик выбора файла
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

    // Обработчики Drag an Drop
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

    function uploadFile() {
        console.log(currentFile);

        // Отправка на сервер
    }


    // Инициализация событий
    fileInput.addEventListener('change', handleFileChange);

    clearFileBtn.addEventListener('click', clearFile);
    uploadFileBtn.addEventListener('click', uploadFile)
    fileUploader.addEventListener('click', handleFileSelect);

    fileUploader.addEventListener('dragenter', handleDragEnter);
    fileUploader.addEventListener('dragover', handleDragOver);
    fileUploader.addEventListener('dragleave', handleDragLeave);
    fileUploader.addEventListener('drop', handleDrop);
});