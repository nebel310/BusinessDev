import { registerUser, loginUser, logoutUser, getCurrentUser, isAuthenticated } from './auth.js';

document.addEventListener('DOMContentLoaded', function () {
    const loginDialog = document.getElementById('login-dialog');
    const registerDialog = document.getElementById('register-dialog');
    const profileDialog = document.getElementById('profile-dialog');

    const signInBtn = document.getElementById('sign-in-btn');
    const signUpBtn = document.getElementById('sign-up-btn');
    const profileBtn = document.getElementById('profile-btn');

    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    const logoutBtn = document.getElementById('logout-btn');

    // Проверка авторизации
    checkAuthStatus();

    initCloseDialogs();

    // Обработчики открытия диалогов
    signInBtn.addEventListener('click', () => {
        loginDialog.showModal();
    });

    signUpBtn.addEventListener('click', () => {
        registerDialog.showModal();
    });

    profileBtn.addEventListener('click', async () => {
        await loadProfileData();
        profileDialog.showModal();
    });

    // Обработчики переключения между формами
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginDialog.close();
        registerDialog.showModal();
    });

    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerDialog.close();
        loginDialog.showModal();
    });

    // Обработка формы регистрации
    document.getElementById('register-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;

        if (password !== passwordConfirm) {
            document.getElementById('register-message').textContent = 'Пароли не совпадают';
            document.getElementById('register-message').className = 'message error';
            return;
        }

        try {
            const result = await registerUser(username, email, password, passwordConfirm);
            document.getElementById('register-message').textContent = 'Регистрация успешна! Перенаправление на вход...';
            document.getElementById('register-message').className = 'message success';

            setTimeout(() => {
                registerDialog.close();
                loginDialog.showModal();
                document.getElementById('register-message').textContent = '';
                document.getElementById('register-form').reset();
            }, 2000);
        } catch (error) {
            document.getElementById('register-message').textContent = "Проблемы с подключением к серверу :(";
            document.getElementById('register-message').className = 'message error';
        }
    });

    // Обработка формы входа
    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const result = await loginUser(email, password);
            document.getElementById('login-message').textContent = result.message || 'Вход выполнен успешно!';
            document.getElementById('login-message').className = 'message success';

            setTimeout(() => {
                loginDialog.close();
                checkAuthStatus();
                document.getElementById('login-message').textContent = '';
                document.getElementById('login-form').reset();
            }, 1000);
        } catch (error) {
            document.getElementById('login-message').textContent = "Проблемы с подключением к серверу :(";
            document.getElementById('login-message').className = 'message error';
        }
    });

    // Обработка кнопки выхода
    logoutBtn.addEventListener('click', async function () {
        await logoutUser();
        profileDialog.close();
        checkAuthStatus();
    });

    // Функция проверки статуса авторизации
    function checkAuthStatus() {
        if (isAuthenticated()) {
            signInBtn.style.display = 'none';
            signUpBtn.style.display = 'none';
            profileBtn.style.display = 'block';
        } else {
            signInBtn.style.display = 'block';
            signUpBtn.style.display = 'block';
            profileBtn.style.display = 'none';
        }
    }

    // Загрузка данных профиля
    async function loadProfileData() {
        const profileInfo = document.getElementById('profile-info');
        profileInfo.innerHTML = '<p>Загрузка данных пользователя...</p>';

        try {
            const user = await getCurrentUser();

            profileInfo.innerHTML = `
                <div class="user-card">
                    <h2>${user.username}</h2>
                    <p>Email: ${user.email}</p>
                    <p>Дата регистрации: ${new Date(user.created_at).toLocaleString()}</p>
                </div>
            `;
        } catch (error) {
            profileInfo.innerHTML = `
                <div class="error message">
                    <p>Ошибка при загрузке профиля: ${error.message}</p>
                </div>
            `;
        }
    }

    // Инициализация закрытия диалогов
    function initCloseDialogs() {
        document.querySelectorAll('.close-dialog').forEach(button => {
            button.addEventListener('click', () => {
                const dialogId = button.getAttribute('data-dialog-close');
                document.getElementById(dialogId).close();
            });
        });

        [loginDialog, registerDialog, profileDialog].forEach(dialog => {
            let mouseDownOnDialog = false;
            let mouseDownOnDialogContent = false;

            dialog.addEventListener('mousedown', e => {
                if (e.target === dialog) {
                    mouseDownOnDialog = true;
                } else {
                    mouseDownOnDialogContent = true;
                }
            });

            dialog.addEventListener('mouseup', e => {
                if (e.target === dialog && mouseDownOnDialog) {
                    dialog.close();
                }

                mouseDownOnDialog = false;
                mouseDownOnDialogContent = false;
            });

            dialog.addEventListener('mouseleave', () => {
            });

            document.addEventListener('mouseup', () => {
                mouseDownOnDialog = false;
                mouseDownOnDialogContent = false;
            });

            const form = dialog.querySelector('form');
            if (form) {
                form.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.stopPropagation();
                    }
                });
            }
        });
    }
});