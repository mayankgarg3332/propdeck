<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('client_id');
            $table->json('products');
            $table->decimal('amount', 14, 2)->default(0);
            $table->decimal('subtotal', 14, 2)->nullable();
            $table->decimal('gst', 14, 2)->nullable();
            $table->string('status', 32)->default('Draft');
            $table->date('date')->nullable();
            $table->string('rep_id', 64)->nullable();
            $table->string('frequency', 64)->nullable();
            $table->json('line_items_snapshot')->nullable();
            $table->timestamp('status_updated_at')->nullable();
            $table->timestamp('created_at_custom')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->cascadeOnDelete();
            $table->foreign('rep_id')->references('id')->on('reps')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposals');
    }
};
