<?php

use App\Models\Proposal;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->string('share_token', 64)->nullable()->unique()->after('payment_link');
        });

        Proposal::whereNull('share_token')->cursor()->each(function (Proposal $proposal) {
            $proposal->update(['share_token' => Str::random(32)]);
        });
    }

    public function down(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->dropColumn('share_token');
        });
    }
};
