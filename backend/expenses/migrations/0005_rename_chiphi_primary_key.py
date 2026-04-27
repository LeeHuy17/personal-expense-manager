# Generated manually to rename ChiPhi primary key

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0004_alter_baocao_user_alter_chiphi_user_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='chiphi',
            old_name='maChiPhi',
            new_name='chiPhiId',
        ),
    ]