<?php

use App\Http\Controllers\Api\AppStateController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProposalController;
use App\Http\Controllers\Api\ProposalEmailController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SubUserController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth.token')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/app-state', [AppStateController::class, 'show']);

    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{id}', [ClientController::class, 'update']);
    Route::delete('/clients/{id}', [ClientController::class, 'destroy']);

    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    Route::post('/proposals', [ProposalController::class, 'store']);
    Route::post('/proposals/send-email', [ProposalEmailController::class, 'send']);
    Route::post('/proposals/pdf-notify', [ProposalEmailController::class, 'notifyPdfDownload']);
    Route::post('/proposals/gmail-notify', [ProposalEmailController::class, 'notifyGmailOpen']);
    Route::post('/proposals/whatsapp-notify', [ProposalEmailController::class, 'notifyWhatsAppShare']);
    Route::get('/proposals/{id}/events', [ProposalController::class, 'events']);
    Route::put('/proposals/{id}', [ProposalController::class, 'update']);
    Route::delete('/proposals/{id}', [ProposalController::class, 'destroy']);

    Route::put('/settings', [SettingsController::class, 'update']);

    Route::get('/sub-users', [SubUserController::class, 'index']);
    Route::post('/sub-users', [SubUserController::class, 'store']);
    Route::put('/sub-users/{id}', [SubUserController::class, 'update']);
    Route::delete('/sub-users/{id}', [SubUserController::class, 'destroy']);
});
