from flask import Blueprint, render_template, request, flash, redirect, url_for
from app import db, Product, ContactMessage
from flask_mail import Message
from app import mail

core_bp = Blueprint('core', __name__)

@core_bp.route('/')
def index():
    featured_products = Product.query.limit(4).all()
    return render_template('core/index.html', products=featured_products)

@core_bp.route('/products')
def products():
    category_filter = request.args.get('category')
    search_query = request.args.get('search')
    
    query = Product.query
    if category_filter:
        query = query.filter_by(category=category_filter)
    if search_query:
        query = query.filter(Product.name.ilike(f'%{search_query}%'))
        
    all_products = query.all()
    return render_template('core/products.html', products=all_products)

@core_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        msg_text = request.form.get('message')
        
        if not name or not email or not msg_text:
            flash('Please fill out all required fields.', 'danger')
            return redirect(url_for('core.contact'))
            
        new_msg = ContactMessage(name=name, email=email, phone=phone, message=msg_text)
        db.session.add(new_msg)
        db.session.commit()
        
        # Async email dispatch notification framework logic placeholder
        try:
            msg = Message("New Inquiry Received - JoyTech Solutions",
                          recipients=[email, "admin@joytechsolutions.com"])
            msg.body = f"Hello {name},\n\nThank you for reaching out to JoyTech Solutions. We have received your inquiry regarding our customized branding apparel and operations services.\n\nMessage Details:\n{msg_text}"
            mail.send(msg)
        except Exception:
            pass # Gracefully handle logging for missing local production SMTP values
            
        flash('Your message has been sent successfully!', 'success')
        return redirect(url_for('core.contact'))
        
    return render_template('core/contact.html')
