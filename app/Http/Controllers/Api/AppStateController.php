<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use Illuminate\Http\Request;

class AppStateController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function show(Request $request)
    {
        return response()->json($this->appState($this->currentUser($request)));
    }
}
