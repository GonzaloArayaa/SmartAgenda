<?php
/**
 * SmartAgenda Pro - Setup Script
 * Ejecutar una sola vez para crear la base de datos con contraseñas hasheadas
 * Uso: php setup.php
 */

$host = 'localhost';
$user = 'smartagenda';
$pass = '1234';

try {
    $pdo = new PDO("mysql:host=$host", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);

    // Leer y ejecutar el script SQL
    $sql = file_get_contents(__DIR__ . '/sql/smartagenda_pro.sql');
    $pdo->exec($sql);

    // Ahora actualizar las contraseñas con hashes reales
    $pdo->exec("USE smartagenda_pro");

    $passwords = [
        ['admin@smartagenda.com', 'admin123'],
        ['martinez@smartagenda.com', 'prof123'],
        ['juanperez@smartagenda.com', 'cliente123'],
        ['laura@smartagenda.com', 'cliente123'],
        ['maria@smartagenda.com', 'prof123'],
    ];

    $stmt = $pdo->prepare("UPDATE usuario SET contrasena = ? WHERE email = ?");
    foreach ($passwords as [$email, $plainPassword]) {
        $hash = password_hash($plainPassword, PASSWORD_DEFAULT);
        $stmt->execute([$hash, $email]);
    }

    echo "========================================\n";
    echo "  SmartAgenda Pro - Setup Completado\n";
    echo "========================================\n\n";
    echo "Base de datos 'smartagenda_pro' creada correctamente.\n";
    echo "Tablas creadas: 10\n";
    echo "Datos de prueba insertados.\n\n";
    echo "Usuarios de prueba:\n";
    echo "  Admin:       admin@smartagenda.com / admin123\n";
    echo "  Profesional: martinez@smartagenda.com / prof123\n";
    echo "  Cliente:     juanperez@smartagenda.com / cliente123\n\n";
    echo "Ahora podes iniciar el servidor PHP con:\n";
    echo "  php -S localhost:8000\n\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
