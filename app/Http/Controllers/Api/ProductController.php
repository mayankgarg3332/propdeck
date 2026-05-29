<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesAccount;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;
    use AuthorizesAccount;

    public function store(Request $request)
    {
        $this->authorizeSection($request, 'products', 'write');

        $data = $request->validate([
            'id' => 'required|string|max:64|unique:products,id',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:64',
            'color' => 'nullable|string|max:32',
            'description' => 'nullable|string',
            'plans' => 'present|array',
        ]);

        $user = $this->currentUser($request);

        $product = Product::create([
            ...$data,
            'plans' => $data['plans'] ?? [],
            'user_id' => $user->accountUserId(),
            'created_by_user_id' => $user->id,
        ]);

        return response()->json($this->productPayload($product), 201);
    }

    public function update(Request $request, string $id)
    {
        $this->authorizeSection($request, 'products', 'write');
        $product = $this->findAccountProduct($request, $id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|max:64',
            'color' => 'nullable|string|max:32',
            'description' => 'nullable|string',
            'plans' => 'sometimes|array',
        ]);

        $product->update($data);

        return response()->json($this->productPayload($product->fresh()));
    }

    public function destroy(Request $request, string $id)
    {
        $this->authorizeSection($request, 'products', 'write');
        $this->findAccountProduct($request, $id)->delete();

        return response()->json(null, 204);
    }
}
