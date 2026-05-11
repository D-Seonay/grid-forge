import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SolverOrchestrator } from '@/lib/solver/orchestrator';
import { dictionaryLoader } from '@/lib/dictionary/loader';

const requestSchema = z.object({
  dimensions: z.object({
    width: z.number().min(3).max(20),
    height: z.number().min(3).max(20),
  }),
  priorityWords: z.array(z.string()).optional().default([]),
  params: z.object({
    maxBlackSquaresRatio: z.number().optional().default(0.2),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = requestSchema.parse(body);

    // Ensure dictionary is loaded
    await dictionaryLoader.load();

    const orchestrator = new SolverOrchestrator({
      width: validatedData.dimensions.width,
      height: validatedData.dimensions.height,
      priorityWords: validatedData.priorityWords,
      maxBlackSquaresRatio: validatedData.params?.maxBlackSquaresRatio,
    });

    const response = await orchestrator.solve();

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, errors: error.issues.map(e => e.message) },
        { status: 400 }
      );
    }
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Internal Server Error'] },
      { status: 500 }
    );
  }
}
