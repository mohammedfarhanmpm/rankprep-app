# Question bank import

Turns the chapter-wise Word question banks (`<Subject>_<Chapter>.docx`) into the app's bundled bank.

1. Put the `.docx` files in a folder, e.g. `raw/`.
2. Parse them (questions, options, answers, solutions; Word equations become Unicode text; images are extracted):

   ```bash
   python3 -I parse.py raw out
   ```

3. Convert images to WebP (max 800 px wide):

   ```bash
   python3 -I webp.py
   ```

4. Write `src/bank/` and `assets/qimg/` in the app (chapter order and display names live in `gen_app.py`):

   ```bash
   python3 -I gen_app.py /path/to/rankprep-app
   ```

Questions whose options or answer could not be read are dropped and counted in the output.
The source `.docx` files are not stored in this repository.
