<?php

use App\Http\Controllers\PublicProposalController;
use Illuminate\Support\Facades\Route;

Route::get('/p/{token}', [PublicProposalController::class, 'show'])->name('proposal.public');
Route::post('/p/{token}/viewed', [PublicProposalController::class, 'trackView'])->name('proposal.public.viewed');

Route::view('/{any?}', 'app')->where('any', '.*');
