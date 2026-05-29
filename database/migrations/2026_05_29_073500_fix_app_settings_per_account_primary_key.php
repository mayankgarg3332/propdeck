<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rows = DB::table('app_settings')->orderBy('id')->get();

        foreach ($rows as $row) {
            if (! $row->user_id) {
                continue;
            }

            $newId = 'default:'.$row->user_id;

            if ($row->id === $newId) {
                continue;
            }

            $targetExists = DB::table('app_settings')->where('id', $newId)->exists();

            if ($targetExists) {
                DB::table('app_settings')->where('id', $row->id)->delete();
            } else {
                DB::table('app_settings')->where('id', $row->id)->update(['id' => $newId]);
            }
        }
    }

    public function down(): void
    {
        $rows = DB::table('app_settings')->where('id', 'like', 'default:%')->get();

        foreach ($rows as $row) {
            if (! DB::table('app_settings')->where('id', 'default')->exists()) {
                DB::table('app_settings')->where('id', $row->id)->update(['id' => 'default']);
            }
        }
    }
};
