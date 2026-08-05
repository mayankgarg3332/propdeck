<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposal_events', function (Blueprint $table) {
            $table->id();
            $table->string('proposal_id');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 32);
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('proposal_id')->references('id')->on('proposals')->cascadeOnDelete();
            $table->index(['proposal_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposal_events');
    }
};
