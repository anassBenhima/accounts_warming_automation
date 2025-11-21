import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createUserLogger } from '@/lib/logger';

/**
 * POST: Duplicate a bulk generation for another user
 * Only admins can use this endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can duplicate bulk generations for other users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can duplicate bulk generations' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { targetUserIds } = body; // Array of user IDs to duplicate for

    if (!targetUserIds || !Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'Target user IDs are required' },
        { status: 400 }
      );
    }

    const logger = createUserLogger(session.user.id);

    // Fetch the original bulk generation with all its data
    const originalBulkGen = await prisma.bulkGeneration.findUnique({
      where: { id },
      include: {
        rows: {
          include: {
            generatedPins: true,
          },
        },
      },
    });

    if (!originalBulkGen) {
      return NextResponse.json({ error: 'Bulk generation not found' }, { status: 404 });
    }

    // Duplicate for each target user
    const duplicatedBulkGens = await Promise.all(
      targetUserIds.map(async (targetUserId: string) => {
        // Create the bulk generation copy
        const newBulkGen = await prisma.bulkGeneration.create({
          data: {
            userId: targetUserId,
            name: `${originalBulkGen.name} (Copy)`,
            imageGenApiKeyId: originalBulkGen.imageGenApiKeyId,
            keywordSearchApiKeyId: originalBulkGen.keywordSearchApiKeyId,
            imageDescApiKeyId: originalBulkGen.imageDescApiKeyId,
            imageGenModel: originalBulkGen.imageGenModel,
            keywordSearchModel: originalBulkGen.keywordSearchModel,
            imageDescModel: originalBulkGen.imageDescModel,
            imageWidth: originalBulkGen.imageWidth,
            imageHeight: originalBulkGen.imageHeight,
            status: 'COMPLETED',
            totalRows: originalBulkGen.totalRows,
            completedRows: originalBulkGen.completedRows,
            failedRows: originalBulkGen.failedRows,
          },
        });

        // Duplicate all rows and their generated pins
        for (const row of originalBulkGen.rows) {
          const newRow = await prisma.bulkGenerationRow.create({
            data: {
              bulkGenerationId: newBulkGen.id,
              keywords: row.keywords,
              imageUrl: row.imageUrl,
              title: row.title,
              description: row.description,
              altText: row.altText,
              quantity: row.quantity,
              status: row.status,
              completedPins: row.completedPins,
              failedPins: row.failedPins,
              apiResponses: row.apiResponses,
            },
          });

          // Duplicate all generated pins for this row
          for (const pin of row.generatedPins) {
            await prisma.bulkGeneratedPin.create({
              data: {
                rowId: newRow.id,
                imageUrl: pin.imageUrl,
                localImagePath: pin.localImagePath,
                title: pin.title,
                description: pin.description,
                keywords: pin.keywords,
                altText: pin.altText,
                status: pin.status,
              },
            });
          }
        }

        return newBulkGen;
      })
    );

    await logger.success({
      module: 'GENERATION',
      action: 'duplicate_bulk',
      message: `Duplicated bulk generation ${id} for ${targetUserIds.length} users`,
      resourceId: id,
      output: { targetUserIds, duplicatedIds: duplicatedBulkGens.map(g => g.id) },
    });

    return NextResponse.json({
      message: `Bulk generation duplicated for ${duplicatedBulkGens.length} users`,
      duplicatedBulkGenerations: duplicatedBulkGens,
    });
  } catch (error) {
    console.error('Error duplicating bulk generation:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate bulk generation' },
      { status: 500 }
    );
  }
}
