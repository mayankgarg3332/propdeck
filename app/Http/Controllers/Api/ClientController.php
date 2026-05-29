<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\Client;
use App\Models\Proposal;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function store(Request $request)
    {
        $this->authorizeSection($request, 'clients', 'write');

        $data = $request->validate([
            'id' => 'required|string|max:64|unique:clients,id',
            'agency' => 'required|string|max:255',
            'contact' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:64',
            'city' => 'nullable|string|max:128',
            'state' => 'nullable|string|max:128',
            'gst' => 'nullable|string|max:64',
            'notes' => 'nullable|string',
        ]);

        $user = $this->currentUser($request);

        $client = Client::create([
            ...$data,
            'user_id' => $user->accountUserId(),
            'created_by_user_id' => $user->id,
        ]);

        return response()->json($this->clientPayload($client), 201);
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeSection($request, 'clients', 'write');
        $client = $this->findAccountClient($request, $id);

        $data = $request->validate([
            'agency' => 'sometimes|string|max:255',
            'contact' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'phone' => 'nullable|string|max:64',
            'city' => 'nullable|string|max:128',
            'state' => 'nullable|string|max:128',
            'gst' => 'nullable|string|max:64',
            'notes' => 'nullable|string',
        ]);

        $client->update($data);

        return response()->json($this->clientPayload($client->fresh()));
    }

    public function destroy(Request $request, string $id)
    {
        $this->authorizeSection($request, 'clients', 'write');
        $client = $this->findAccountClient($request, $id);

        Proposal::where('user_id', $this->accountUserId($request))
            ->where('client_id', $id)
            ->delete();
        $client->delete();

        return response()->json(null, 204);
    }
}
