<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Models\Client;
use App\Models\Product;
use App\Models\Proposal;
use App\Models\Rep;
use App\Models\User;
use Illuminate\Database\Seeder;

class TripDeckSeeder extends Seeder
{
    public function run(): void
    {
        $data = TripDeckSeedData::all();
        $ownerId = User::whereNull('parent_user_id')->orderBy('id')->value('id');

        foreach ($data['reps'] as $rep) {
            Rep::updateOrCreate(['id' => $rep['id']], array_merge($rep, ['user_id' => $ownerId]));
        }

        foreach ($data['clients'] as $client) {
            Client::updateOrCreate(
                ['id' => $client['id']],
                array_merge($client, [
                    'user_id' => $ownerId,
                    'created_by_user_id' => $ownerId,
                ]),
            );
        }

        foreach ($data['products'] as $product) {
            Product::updateOrCreate(
                ['id' => $product['id']],
                array_merge($product, [
                    'user_id' => $ownerId,
                    'created_by_user_id' => $ownerId,
                ]),
            );
        }

        AppSetting::updateOrCreate(
            ['id' => AppSetting::accountKey($ownerId)],
            [
                'user_id' => $ownerId,
                'company' => $data['settings']['company'],
                'payment' => $data['settings']['payment'],
                'email' => $data['settings']['email'],
                'defaults' => $data['settings']['defaults'],
            ],
        );

        foreach ($data['proposals'] as $proposal) {
            Proposal::updateOrCreate(
                ['id' => $proposal['id']],
                [
                    'client_id' => $proposal['clientId'],
                    'products' => $proposal['products'],
                    'amount' => $proposal['amount'],
                    'status' => $proposal['status'],
                    'date' => $proposal['date'],
                    'rep_id' => $proposal['repId'] ?? null,
                    'user_id' => $ownerId,
                    'created_by_user_id' => $ownerId,
                ],
            );
        }
    }
}
